"use client"

import { useEffect, useMemo } from "react"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { isSameToken } from "@/lib/asset-ops"
import { coinView, measureCoins } from "@/lib/coin-store"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj, PackObj } from "@/lib/types"

import { ObjectMesh, type ObjectShape } from "./ObjectMesh"
import { clipPlanes } from "./clip-planes"
import { objectTint } from "./objectVisual"

// The 3D layer over the dashboard. Deliberately thin: the DOM grid keeps layout, hit-testing, scrolling
// and the labels, and this only draws an object into the box each card reserves. That keeps the existing
// pointer/drop machinery untouched and avoids reprojecting DOM overlays every frame.
//
// The canvas is pointer-events-none and sits above the shell (so a dragged object flies over the
// contacts panel intact) but below the modals at z-200+.

/** A one-of-one reads as a picture, not currency. Everything else is still a coin — packs and stacks are
 *  their own shapes to come. */
const objectShape = (obj: AssetObj | PackObj): ObjectShape => (obj.class === "asset" && obj.kind === "nft" ? "nft" : "coin")

/** Packs carry no ticker. Initials, not a truncated first word — "Chase Pack" has to strike as CP; CHAS
 *  just reads as a broken string. Words with no leading alphanumeric (the "—" in "Gift — Charizard")
 *  contribute nothing. */
function coinSymbol(obj: AssetObj | PackObj) {
  if ("symbol" in obj) return obj.symbol
  const initials = obj.label
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w))
    .map((w) => w[0])
    .slice(0, 3)
    .join("")
  return initials.toUpperCase() || "PACK"
}

/** Refreshes the shared screen geometry once per frame, before any object reads it. Mounted first in the
 *  tree on purpose: r3f runs useFrame callbacks in registration order, and giving this an explicit
 *  priority would hand us responsibility for rendering. */
function ObjectRig() {
  useFrame((state) => {
    measureCoins()

    // clip the resting objects to the grid's scroll viewport. THREE.Plane keeps the half-space where
    // normal·p + constant > 0, and the ortho camera puts world origin at the viewport centre.
    const { width: w, height: h } = state.size
    const { clip } = coinView
    clipPlanes[0].constant = h / 2 - clip.top
    clipPlanes[1].constant = -(h / 2 - clip.bottom)
    clipPlanes[2].constant = -(clip.left - w / 2)
    clipPlanes[3].constant = clip.right - w / 2
  })

  return null
}

/** Metal needs something to reflect or it renders near-black. RoomEnvironment ships inside three, so
 *  this costs no asset and no network round-trip — unlike drei's <Environment> presets.
 *
 *  Attached declaratively rather than assigned onto the scene: r3f then owns mounting and detaching it,
 *  and the React Compiler's immutability rule bans writing to a value a hook handed back. */
function ObjectEnvironment() {
  const gl = useThree((s) => s.gl)

  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose() // the generator's scratch targets, not the texture it just handed back
    return texture
  }, [gl])

  useEffect(() => () => env.dispose(), [env])

  return <primitive object={env} attach="environment" />
}

export function ObjectScene({ items }: { items: (AssetObj | PackObj)[] }) {
  // drag
  const { asset: dragged } = useDrag()

  // hooks
  const reduced = usePrefersReducedMotion()

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1000], zoom: 1, near: 0.1, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        // r3f hard-codes `pointer-events: auto` inline on its wrapper unless it's given an eventSource,
        // which beats any class and would leave the canvas swallowing every pointer event on the page.
        // Nothing here uses r3f's raycaster — hit-testing is entirely the DOM's job — so switch it off.
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true
        }}
      >
        <ObjectRig />
        <ObjectEnvironment />
        {/* ambient stays low on purpose: it lights metal flatly and washes the milling out. The
            environment does the shaping, the key picks out the rim. */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[-200, 300, 500]} intensity={2.6} />
        <directionalLight position={[300, -150, 200]} intensity={0.7} />
        {items.map((obj) => (
          <ObjectMesh
            key={obj.id}
            id={obj.id}
            shape={objectShape(obj)}
            tint={objectTint(obj)}
            symbol={coinSymbol(obj)}
            dragging={dragged?.id === obj.id}
            anyDragging={!!dragged}
            dimmed={!!dragged && !isSameToken(dragged, obj)}
            reduced={reduced}
          />
        ))}
      </Canvas>
    </div>
  )
}
