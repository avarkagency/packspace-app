"use client"

import { useEffect, useMemo, useRef } from "react"

import * as THREE from "three"
import { coinView } from "@/stores/coin"
import { useFrame } from "@react-three/fiber"

// A dock icon in the scene: a flat textured plane riding the slot its tile registered, exactly as the
// coins ride theirs. Flat on purpose — the nav artwork is an app tile, not an object you own — but it
// lives in the canvas so a dragged coin and a dock target share one world, ready for the drop
// interactions to come. Unlit and untonemapped, so the artwork's colours arrive exactly as authored.

export function ObjectNavIcon({ id, src }: { id: string; src: string }) {
  // refs
  const meshRef = useRef<THREE.Mesh>(null!)

  // data — the tile artwork. The PNGs carry their own rounded corners in alpha.
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(src)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [src])

  // effects
  useEffect(() => () => texture.dispose(), [texture])

  // frame — the DOM owns layout; the plane just sits on the measured rect (ortho: 1 unit = 1 px)
  useFrame((state) => {
    const rect = coinView.rects.get(id)
    const m = meshRef.current
    // while the Inspector has a coin in focus the canvas lifts over the takeover — the dock tiles must not
    // ride up with it
    if (!rect || coinView.focusId) {
      m.visible = false
      return
    }
    m.visible = true
    const { width: w, height: h } = state.size
    m.position.set(rect.cx - w / 2, h / 2 - rect.cy, 0)
    m.scale.set(rect.size, rect.size, 1)
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
