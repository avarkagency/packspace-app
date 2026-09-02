import * as THREE from "three"

// Coins differ only by material, so the geometry uploads once.
//
// Three pieces rather than one capped cylinder: CylinderGeometry derives cap UVs from (cosθ, sinθ) while
// its ring vertices run (sinθ, cosθ) — an axis swap, which is a REFLECTION, so cap artwork lands rotated
// and mirrored and no texture rotation can undo it. CircleGeometry maps U←x, V←y straight.

const SEGMENTS = 64
const THICKNESS = 0.26 // relative to the unit radius; the coin is scaled to the card's slot

export const COIN_HALF_THICKNESS = THICKNESS / 2

export const coinRimGeometry = new THREE.CylinderGeometry(1, 1, THICKNESS, SEGMENTS, 1, true)
export const coinFaceGeometry = new THREE.CircleGeometry(1, SEGMENTS)

const FACE_PX = 256

/** The light palette is greyscale on purpose: `map` multiplies the material colour, so one canvas recipe
 *  tints itself for every coin. The dark one is drawn at final colours instead — a multiply can only
 *  darken, so light lettering on a black field is unreachable from a tinted white canvas. */
export type CoinFinish = "light" | "dark"

const FACE_INK: Record<CoinFinish, { base: string; ring: string; field: string; device: string; hub: string }> = {
  light: {
    base: "#ffffff",
    ring: "#b4b4b4",
    field: "#ededed",
    device: "#4d4d4d",
    hub: "#bdbdbd"
  },
  // a step lighter than the desktop's charcoal, so a black coin still separates from a dark field
  dark: {
    base: "#212429",
    ring: "#464c55",
    field: "#292d33",
    device: "#d3d7dd",
    hub: "#464c55"
  }
}

function faceCanvas(finish: CoinFinish) {
  const c = document.createElement("canvas")
  c.width = FACE_PX
  c.height = FACE_PX
  const ctx = c.getContext("2d")!
  const r = FACE_PX / 2
  const ink = FACE_INK[finish]

  ctx.fillStyle = ink.base
  ctx.fillRect(0, 0, FACE_PX, FACE_PX)

  ctx.strokeStyle = ink.ring
  ctx.lineWidth = FACE_PX * 0.018
  ctx.beginPath()
  ctx.arc(r, r, r * 0.86, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = ink.field
  ctx.beginPath()
  ctx.arc(r, r, r * 0.78, 0, Math.PI * 2)
  ctx.fill()

  return { c, ctx, r, ink }
}

function toTexture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function makeCoinFrontTexture(symbol: string, finish: CoinFinish = "light") {
  const { c, ctx, r, ink } = faceCanvas(finish)
  const fit = symbol.length <= 3 ? 0.4 : symbol.length <= 4 ? 0.32 : 0.24

  ctx.fillStyle = ink.device
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${FACE_PX * fit}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText(symbol, r, r)

  return toTexture(c)
}

/** No text: it's viewed from behind, so any lettering would read mirrored. */
function makeCoinBackTexture(finish: CoinFinish = "light") {
  const { c, ctx, r, ink } = faceCanvas(finish)

  ctx.strokeStyle = ink.ring
  ctx.lineWidth = FACE_PX * 0.012
  for (const scale of [0.62, 0.46, 0.3]) {
    ctx.beginPath()
    ctx.arc(r, r, r * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = ink.hub
  ctx.beginPath()
  ctx.arc(r, r, r * 0.12, 0, Math.PI * 2)
  ctx.fill()

  return toTexture(c)
}

/** Mesh order: rim, front, back.
 *
 *  The faces are unlit deliberately. Under an ORTHOGRAPHIC camera every point on a flat face-on surface
 *  shares one view vector, so a metal face reflects a single constant of the environment across its whole
 *  area — every pixel comes back byte-identical. That isn't a reflection, it's a uniform wash on the
 *  artwork, and it's what made faces read pale against their own source images. The rim is curved, so it
 *  still catches the environment. `toneMapped: false` also takes the faces around ACES, so art lands at
 *  exactly its authored colour. */
export function makeCoinMaterials(tint: string, symbol: string, planes: THREE.Plane[], finish: CoinFinish = "light") {
  // a dark face is authored at its final colours, so its material must not tint it — the rim still
  // carries the coin's own (near-black) colour
  const faceColor = finish === "dark" ? new THREE.Color("#ffffff") : new THREE.Color(tint)
  const clip = { clippingPlanes: planes, clipShadows: false }

  return [
    new THREE.MeshStandardMaterial({
      ...clip,
      color: new THREE.Color(tint),
      metalness: 0.9,
      roughness: 0.32
    }),
    new THREE.MeshBasicMaterial({
      ...clip,
      color: faceColor,
      map: makeCoinFrontTexture(symbol, finish),
      toneMapped: false
    }),
    new THREE.MeshBasicMaterial({
      ...clip,
      color: faceColor.clone(),
      map: makeCoinBackTexture(finish),
      toneMapped: false
    })
  ]
}
