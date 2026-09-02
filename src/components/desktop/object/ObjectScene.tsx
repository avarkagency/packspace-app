"use client"

import { useEffect, useMemo } from "react"

import * as THREE from "three"
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

const WALLET_TINT = "#212429"

const objectShape = (obj: DesktopObj): ObjectShape => (obj.class === "asset" && obj.kind === "nft" ? "nft" : "coin")

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

function ObjectRig() {
  useFrame((state) => {
    measureCoins()

    const { width: w, height: h } = state.size
    const { clip } = coinView
    clipPlanes[0].constant = h / 2 - clip.top
    clipPlanes[1].constant = -(h / 2 - clip.bottom)
    clipPlanes[2].constant = -(clip.left - w / 2)
    clipPlanes[3].constant = clip.right - w / 2
  })

  return null
}

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
  // drag
  const { obj: dragged, carriedIds } = useDrag()
  const draggedAsset = dragged?.class === "asset" ? dragged : null
  const anyDragging = !!dragged || !!carriedIds

  // hooks
  const focusId = useCoinFocus()

  return (
    <div className={`pointer-events-none fixed inset-0 ${focusId ? "z-[200]" : anyDragging ? "z-[150]" : "z-50"}`}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1000], zoom: 1, near: 0.1, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true
        }}>
        <ObjectRig />
        <ObjectEnvironment />
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
            artSrc={obj.class === "person" ? contactImage(obj) : undefined}
            finish="light"
            dragging={dragged?.id === obj.id}
            carried={!!carriedIds?.has(obj.id)}
            anyDragging={anyDragging}
            dimmed={!!draggedAsset && obj.class === "asset" && !isSameToken(draggedAsset, obj)}
          />
        ))}
        {nav.map((item) => (
          <ObjectNavIcon key={item.id} id={item.id} src={item.icon} />
        ))}
      </Canvas>
    </div>
  )
}
