import * as THREE from "three"

const SEGMENTS = 64
const THICKNESS = 0.26

export const COIN_HALF_THICKNESS = THICKNESS / 2

export const coinRimGeometry = new THREE.CylinderGeometry(1, 1, THICKNESS, SEGMENTS, 1, true)
export const coinFaceGeometry = new THREE.CircleGeometry(1, SEGMENTS)

const FACE_PX = 256

export type CoinFinish = "light" | "dark"

const FACE_INK: Record<CoinFinish, { base: string; ring: string; field: string; device: string; hub: string }> = {
  light: {
    base: "#ffffff",
    ring: "#b4b4b4",
    field: "#ededed",
    device: "#4d4d4d",
    hub: "#bdbdbd"
  },

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

export function makeCoinMaterials(tint: string, symbol: string, planes: THREE.Plane[], finish: CoinFinish = "light") {
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
