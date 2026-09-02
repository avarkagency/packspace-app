import * as THREE from "three"

const SIZE = 2
const RADIUS = 0.18
const DEPTH = 0.07
const BEVEL = 0.02
const BORDER = 0.064
const IMAGE = SIZE - BORDER * 2

export const NFT_FACE_Z = DEPTH / 2 + BEVEL + 0.004

function roundedRect(size: number, radius: number) {
  const s = new THREE.Shape()
  const h = size / 2
  s.moveTo(-h + radius, -h)
  s.lineTo(h - radius, -h)
  s.quadraticCurveTo(h, -h, h, -h + radius)
  s.lineTo(h, h - radius)
  s.quadraticCurveTo(h, h, h - radius, h)
  s.lineTo(-h + radius, h)
  s.quadraticCurveTo(-h, h, -h, h - radius)
  s.lineTo(-h, -h + radius)
  s.quadraticCurveTo(-h, -h, -h + radius, -h)
  return s
}

export const nftCardGeometry = new THREE.ExtrudeGeometry(roundedRect(SIZE, RADIUS), {
  depth: DEPTH,
  bevelEnabled: true,
  bevelThickness: BEVEL,
  bevelSize: BEVEL,
  bevelSegments: 2,
  curveSegments: 12
})

nftCardGeometry.translate(0, 0, -DEPTH / 2)

function fitUv(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox!
  const w = bounds.max.x - bounds.min.x
  const h = bounds.max.y - bounds.min.y
  const pos = geometry.attributes.position
  const uv = geometry.attributes.uv

  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - bounds.min.x) / w, (pos.getY(i) - bounds.min.y) / h)
  }
  uv.needsUpdate = true

  return geometry
}

export const nftImageGeometry = fitUv(new THREE.ShapeGeometry(roundedRect(IMAGE, RADIUS * 0.55), 12))

export function makeNftMaterials(planes: THREE.Plane[]) {
  const common = { clippingPlanes: planes, clipShadows: false }
  return [
    new THREE.MeshStandardMaterial({ ...common, color: "#f3f2ef", metalness: 0.04, roughness: 0.62 }),
    new THREE.MeshBasicMaterial({ ...common, color: "#8b8b90", toneMapped: false })
  ]
}
