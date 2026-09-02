import * as THREE from "three"

// A polaroid: rounded white card, image inset in a deep border, identical front and back so the hover
// spin never turns up a blank. No tint — the artwork is the identity.

const SIZE = 2 // matches the coin's diameter: the mesh is scaled by half the slot, so this fills it
const RADIUS = 0.18
const DEPTH = 0.07
const BEVEL = 0.02
const BORDER = 0.064 // a fine white margin — the picture, not the mount, is the object
const IMAGE = SIZE - BORDER * 2

/** Where the image sits — just proud of the card's face, bevel included. Mirrored on the back. */
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
// ExtrudeGeometry builds forward from z=0; centre it so the card turns about its own face, not its back
nftCardGeometry.translate(0, 0, -DEPTH / 2)

/** ShapeGeometry writes raw vertex coordinates into its UVs instead of normalising them, so a texture
 *  maps 1:1 against world units — on a shape centred at the origin that puts the whole image in the
 *  +x/+y quadrant and clamps the edge pixel across the other three. Remap to the shape's bounds. */
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

/** [card, image], matching the mesh order in ObjectMesh.
 *
 *  The picture is unlit: at the intensity the metal rims need, a lit surface blows artwork out to a wash,
 *  and a printed photo reflects nothing anyway. The card around it stays lit and carries the depth. */
export function makeNftMaterials(planes: THREE.Plane[]) {
  const common = { clippingPlanes: planes, clipShadows: false }
  return [
    new THREE.MeshStandardMaterial({ ...common, color: "#f3f2ef", metalness: 0.04, roughness: 0.62 }),
    new THREE.MeshBasicMaterial({ ...common, color: "#8b8b90", toneMapped: false })
  ]
}
