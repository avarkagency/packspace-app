import * as THREE from "three"

// Shared geometry for every coin — coins differ only by material, so these upload once.
//
// The coin is built from three pieces rather than one capped cylinder. CylinderGeometry derives its cap
// UVs from (cosθ, sinθ) while the ring vertices run (sinθ, cosθ), so U maps to local Z and V to local X
// — an axis swap, which is a reflection. Artwork on a cap lands rotated *and* mirrored, and no texture
// rotation can undo a reflection. CircleGeometry maps U←x, V←y straight, so a face texture arrives
// exactly as drawn. The rim is therefore open-ended and the faces are their own discs.

const SEGMENTS = 64
const THICKNESS = 0.26 // relative to the unit radius; the coin is scaled to the card's slot

export const COIN_HALF_THICKNESS = THICKNESS / 2

export const coinRimGeometry = new THREE.CylinderGeometry(1, 1, THICKNESS, SEGMENTS, 1, true)
export const coinFaceGeometry = new THREE.CircleGeometry(1, SEGMENTS)

const FACE_PX = 256

/** The two face palettes. The light one is greyscale on purpose: `map` multiplies the material's
 *  colour, so white reads as the asset's full tint and darker values shade it — one canvas recipe
 *  tints itself for every coin. The dark one is drawn at its final colours instead (its face material
 *  stays white), because a multiply can only darken — light lettering on a black field is unreachable
 *  from a tinted white canvas. */
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

/** Shared drawing for both faces: base, milled ring just inside the rim, recessed field for the device. */
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

/** Front face — carries the ticker. */
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

/** Back face — concentric milling, no text. It's viewed from behind, so any lettering would read
 *  mirrored anyway. */
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

/** Materials in mesh order: rim, front face, back face.
 *
 *  The rim is metal; the faces are unlit, and deliberately so. Under an orthographic camera every point
 *  on a flat face-on surface shares one view vector, so a metal face reflects a single constant of the
 *  environment across its whole area — measurably: every pixel of it comes back byte-identical. That's
 *  not a reflection, it's a uniform wash sitting on top of the artwork, and it's what made the faces
 *  read pale against their own source images. The rim is curved, so it still catches the environment
 *  properly and carries the coin. `toneMapped: false` takes the faces around ACES as well, so art lands
 *  at exactly the colour it was authored. */
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
