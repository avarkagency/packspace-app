"use client"

import { useEffect, useMemo, useRef } from "react"

import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { coinView } from "@/lib/coin-store"

import { clipPlanes, makeObjectPlanes, noClipPlanes } from "./clip-planes"
import { COIN_HALF_THICKNESS, coinFaceGeometry, coinRimGeometry, makeCoinMaterials } from "./coin-geometry"
import { NFT_FACE_Z, makeNftMaterials, nftCardGeometry, nftImageGeometry } from "./nft-geometry"
import { loadObjectArt } from "./object-art"

// One object in the grid. Everything about how it *behaves* — where it sits, how it turns, lifts, flies,
// clips and fades — is identical whatever it looks like, so the shape only decides which meshes hang off
// the size group at the end.

const SPIN_SPEED = 1.6 // rad/s — continuous spin while hovered
const HOVER_SCALE = 1.12
/** Exported so the drag label can clear the lifted object — its size is relative to its cell, so the
 *  label's offset has to be derived rather than fixed. */
export const DRAG_SCALE = 1.22
const DIM_OPACITY = 0.4 // matches the cell's own fade while an unrelated object is in hand
const RETURN_EASE = 14 // ~250ms to fly home on release — an exit, so quicker than it went out
const RETURN_SNAP = 0.5 // px; where the ease is close enough to hand the object back to its rect
// Ortho projection, so this only orders the dragged object in front — it never changes its size. It has
// to clear the grid by more than an object's radius: a spinning one sweeps its whole radius through z as
// it passes edge-on, so a small offset lets the two intersect and slice through each other.
const DRAG_Z = 500
const TWO_PI = Math.PI * 2

export type ObjectShape = "coin" | "nft"

type Props = {
  id: string
  shape: ObjectShape
  tint: string
  symbol: string
  dragging: boolean
  /** Whether any object is mid-drag — the resting ones go inert while one is in hand. */
  anyDragging: boolean
  /** Recede: something unrelated is in hand. Matches the cell's own fade. */
  dimmed: boolean
  reduced: boolean
}

export function ObjectMesh({ id, shape, tint, symbol, dragging, anyDragging, dimmed, reduced }: Props) {
  // refs — scale wraps spin so the two compose rather than fight; slide carries the screen position
  const slideRef = useRef<THREE.Group>(null!)
  const scaleRef = useRef<THREE.Group>(null!)
  const spinRef = useRef<THREE.Group>(null!)
  const sizeRef = useRef<THREE.Group>(null!)
  const fadeRef = useRef(1)
  const blendedRef = useRef(false)
  const wasDraggingRef = useRef(false)
  const returningRef = useRef(false)

  // data — this object's own plane array. The materials hold this reference for life and the frame loop
  // copies either clip source into it, so swapping clip modes can never recompile the shader.
  const planes = useMemo(() => makeObjectPlanes(), [])
  const materials = useMemo(
    () => (shape === "nft" ? makeNftMaterials(planes) : makeCoinMaterials(tint, symbol, planes)),
    [shape, tint, symbol, planes]
  )

  // data — the textures this object drew for itself. Captured now, before any token art swaps in, so
  // unmounting disposes only what it owns: the token texture is shared and cached, and disposing it
  // here would blank the face of every other object holding the same symbol.
  const ownTextures = useMemo(() => materials.map((m) => m.map).filter((t): t is THREE.Texture => !!t), [materials])

  // effects — the drawn faces are per-object canvases, so they leak unless disposed with the object
  useEffect(
    () => () => {
      ownTextures.forEach((t) => t.dispose())
      materials.forEach((m) => m.dispose())
    },
    [materials, ownTextures]
  )

  // effects — real art replaces whatever the object drew for itself. A symbol with no art (the stack, the
  // packs) simply keeps its drawn face.
  useEffect(() => {
    let live = true

    loadObjectArt(symbol).then((art) => {
      if (!live || !art) return
      // map multiplies colour, so every surface taking the art drops its tint or it would stain it
      if (shape === "nft") {
        const image = materials[1]
        image.map = art.map
        image.color.set("#ffffff")
        image.needsUpdate = true
        return
      }

      const [rim, front, back] = materials
      for (const face of [front, back]) {
        face.map = art.map
        face.color.set("#ffffff")
        face.needsUpdate = true
      }
      // the rim takes the artwork's own background, so the coin reads as one object rather than a face
      // stuck on a differently-coloured blank
      rim.color.copy(art.base)
    })

    return () => {
      live = false
    }
  }, [shape, symbol, materials])

  // frame — the DOM grid owns layout, so position comes from the measured card rect, not from 3D state.
  // The ortho camera maps 1 world unit to 1 px with the origin at the viewport centre.
  useFrame((state, dt) => {
    const rect = coinView.rects.get(id)
    const g = slideRef.current
    if (!rect) {
      g.visible = false
      return
    }
    g.visible = true

    const { width: w, height: h } = state.size
    const k = Math.min(1, dt * 10)

    if (dragging) {
      g.position.set(coinView.cursor.x - w / 2, h / 2 - coinView.cursor.y, DRAG_Z)
      wasDraggingRef.current = true
    } else {
      // let go: fly home from wherever it was dropped instead of blinking back into the cell
      if (wasDraggingRef.current) {
        wasDraggingRef.current = false
        returningRef.current = true
      }

      const tx = rect.cx - w / 2
      const ty = h / 2 - rect.cy
      if (returningRef.current) {
        const rk = Math.min(1, dt * RETURN_EASE)
        g.position.x += (tx - g.position.x) * rk
        g.position.y += (ty - g.position.y) * rk
        g.position.z += (0 - g.position.z) * rk
        // an exponential ease never quite lands, so close the last fraction of a pixel by hand
        if (Math.hypot(tx - g.position.x, ty - g.position.y) < RETURN_SNAP && g.position.z < RETURN_SNAP) {
          g.position.set(tx, ty, 0)
          returningRef.current = false
        }
      } else {
        g.position.set(tx, ty, 0)
      }
    }
    sizeRef.current.scale.setScalar(rect.size / 2)

    // the object in hand reads from the pushed-out clip set so it can fly over the chrome — and it has to
    // keep reading it the whole way home, or it would be sliced off at the grid's edge on the way back
    const src = dragging || returningRef.current ? noClipPlanes : clipPlanes
    for (let i = 0; i < planes.length; i++) planes[i].copy(src[i])

    // the object in hand spins; every resting one holds still while it does. Dragging one over another
    // otherwise wakes the one underneath, and two spinning objects sweep through each other's space.
    const hovered = coinView.hoverId === id && !anyDragging
    const spinning = (dragging || hovered) && !reduced
    if (spinning) {
      spinRef.current.rotation.y += dt * SPIN_SPEED
    } else {
      // settle square-on rather than mid-turn — unwind to the nearest whole revolution
      const tgt = Math.round(spinRef.current.rotation.y / TWO_PI) * TWO_PI
      spinRef.current.rotation.y += (tgt - spinRef.current.rotation.y) * Math.min(1, dt * 6)
    }

    const s = dragging ? DRAG_SCALE : hovered ? HOVER_SCALE : 1
    scaleRef.current.scale.setScalar(scaleRef.current.scale.x + (s - scaleRef.current.scale.x) * k)

    // fade to match the cell. `transparent` is only switched on while actually faded — an always-blended
    // object stops writing depth, and the spinning one in hand would show through the grid behind it.
    fadeRef.current += ((dimmed ? DIM_OPACITY : 1) - fadeRef.current) * k
    const blended = fadeRef.current < 0.999
    if (blended !== blendedRef.current) {
      materials.forEach((m) => {
        m.transparent = blended
        m.needsUpdate = true
      })
      blendedRef.current = blended
    }
    materials.forEach((m) => (m.opacity = fadeRef.current))
  })

  return (
    <group ref={slideRef}>
      <group ref={scaleRef}>
        <group ref={spinRef}>
          {/* objects rest square-on to the camera — the only rotation they ever take is the hover spin */}
          <group ref={sizeRef}>{shape === "nft" ? <NftBody materials={materials} /> : <CoinBody materials={materials} />}</group>
        </group>
      </group>
    </group>
  )
}

/** The rim's axis is turned onto Z; the faces already face the camera as built. */
function CoinBody({ materials }: { materials: THREE.Material[] }) {
  return (
    <>
      <mesh geometry={coinRimGeometry} material={materials[0]} rotation-x={Math.PI / 2} />
      <mesh geometry={coinFaceGeometry} material={materials[1]} position-z={COIN_HALF_THICKNESS} />
      <mesh geometry={coinFaceGeometry} material={materials[2]} position-z={-COIN_HALF_THICKNESS} rotation-y={Math.PI} />
    </>
  )
}

/** A polaroid: white card with the image laid just proud of each face — identical either side, so the
 *  hover spin never turns up a blank back. Both faces share one material; the fade sets opacity on it
 *  once and both follow. */
function NftBody({ materials }: { materials: THREE.Material[] }) {
  return (
    <>
      <mesh geometry={nftCardGeometry} material={materials[0]} />
      <mesh geometry={nftImageGeometry} material={materials[1]} position-z={NFT_FACE_Z} />
      <mesh geometry={nftImageGeometry} material={materials[1]} position-z={-NFT_FACE_Z} rotation-y={Math.PI} />
    </>
  )
}
