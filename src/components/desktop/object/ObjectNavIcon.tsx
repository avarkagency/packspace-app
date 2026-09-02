"use client"

import { useEffect, useMemo, useRef } from "react"

import * as THREE from "three"
import { coinView } from "@/stores/coin"
import { useFrame } from "@react-three/fiber"

export function ObjectNavIcon({ id, src }: { id: string; src: string }) {
  // refs
  const meshRef = useRef<THREE.Mesh>(null!)

  // data
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(src)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [src])

  // effects
  useEffect(() => () => texture.dispose(), [texture])

  // frame
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
