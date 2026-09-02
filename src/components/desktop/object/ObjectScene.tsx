"use client"

import { useEffect, useMemo } from "react"

import * as THREE from "three"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { clipPlanes } from "@/stores/clip-planes"
import { coinView, measureCoins, useCoinFocus } from "@/stores/coin"
import { useDrag } from "@/stores/drag"
import type { DesktopObj, NavItem } from "@/types/objects"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

import { isSameToken } from "@/lib/asset-ops"

import { ObjectMesh, type ObjectShape } from "./ObjectMesh"
import { ObjectNavIcon } from "./ObjectNavIcon"
import { contactImage, objectTint } from "./ObjectVisual"

// The 3D layer over the desktop. Deliberately thin: the DOM keeps layout, hit-testing and the labels,
// and this only draws an object into the box each desktop icon reserves. That keeps the existing
// pointer/drop machinery untouched and avoids reprojecting DOM overlays every frame.
//
// The canvas is pointer-events-none and sits above the desktop (so a dragged object flies over the
// wallet icons intact) but below the modals at z-200+.

/** Wallets are the black tokens for the time being — their rim colour, matched to the dark face. */
const WALLET_TINT = "#212429"

/** A one-of-one reads as a picture, not currency. Everything else — wallets included — is a coin. */
const objectShape = (obj: DesktopObj): ObjectShape => (obj.class === "asset" && obj.kind === "nft" ? "nft" : "coin")

/** Wallets carry no ticker, so their coin face takes a monogram: initials for a multi-word name
 *  ("Mia — PackMarket" strikes as MP), the first letters otherwise. Words with no leading alphanumeric
 *  (the "—") contribute nothing. */
function coinSymbol(obj: DesktopObj) {
  if (obj.class === "asset") return obj.symbol
  const words = obj.label.split(/\s+/).filter((w) => /^[a-z0-9]/i.test(w))
  if (words.length >= 2)
    return words
      .map((w) => w[0])
      .slice(0, 3)
      .join("")
      .toUpperCase()
  return (words[0] ?? "?").slice(0, 3).toUpperCase()
}

/** Refreshes the shared screen geometry once per frame, before any object reads it. Mounted first in the
 *  tree on purpose: r3f runs useFrame callbacks in registration order, and giving this an explicit
 *  priority would hand us responsibility for rendering. */
function ObjectRig() {
  useFrame((state) => {
    measureCoins()

    // clip the resting objects to the desktop surface. THREE.Plane keeps the half-space where
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

export function ObjectScene({ items, nav = [] }: { items: DesktopObj[]; nav?: NavItem[] }) {
  // drag — a single object in hand, or a carried multi-selection; either counts as "dragging"
  const { obj: dragged, carriedIds } = useDrag()
  const draggedAsset = dragged?.class === "asset" ? dragged : null
  const anyDragging = !!dragged || !!carriedIds

  // hooks
  const reduced = usePrefersReducedMotion()
  const focusId = useCoinFocus()

  return (
    // Above the desk at rest; above the folder windows (z 100+) too while something is in hand, so a coin
    // pulled out of a folder flies over the window instead of vanishing under its glass; and above the AI
    // Inspector takeover (z-190) while a coin flies into its art card.
    <div className={`pointer-events-none fixed inset-0 ${focusId ? "z-[200]" : anyDragging ? "z-[150]" : "z-50"}`}>
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
        }}>
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
            tint={obj.class === "person" ? WALLET_TINT : objectTint(obj)}
            symbol={coinSymbol(obj)}
            // contacts wear their avatar on the coin face; everything else keeps its symbol-keyed art
            artSrc={obj.class === "person" ? contactImage(obj) : undefined}
            finish="light"
            dragging={dragged?.id === obj.id}
            carried={!!carriedIds?.has(obj.id)}
            anyDragging={anyDragging}
            // wallets never recede — they're where a dragged coin is headed
            dimmed={!!draggedAsset && obj.class === "asset" && !isSameToken(draggedAsset, obj)}
            reduced={reduced}
          />
        ))}
        {/* the dock's app tiles — flat planes in the same world the coins fly through */}
        {nav.map((item) => (
          <ObjectNavIcon key={item.id} id={item.id} src={item.icon} />
        ))}
      </Canvas>
    </div>
  )
}
