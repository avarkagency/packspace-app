import * as THREE from "three"

// The NFT object: a polaroid. A rounded white card with a little depth and the image inset in a deep
// white border, identical front and back. Unlike a coin it carries no tint — the artwork is the
// identity, so until real images land the inset is a flat grey.

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

/** ShapeGeometry writes raw vertex coordinates straight into its UVs instead of normalising them, so a
 *  texture maps 1:1 against world units. On a shape centred at the origin that puts the whole image in
 *  the +x/+y quadrant and clamps the edge pixel across the other three. Remap to the shape's bounds. */
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

/** [card, image] — matching the mesh order in ObjectMesh.
 *
 *  The picture is unlit on purpose. A lit surface takes the key light on top of its own colour, and at
 *  the intensity the metal rims need that blows artwork out to a wash. A printed photo doesn't
 *  reflect anything anyway — leaving it unlit is both truer to the object and the only way the art
 *  arrives on screen as authored. The card around it stays lit, and carries the depth. */
export function makeNftMaterials(planes: THREE.Plane[]) {
  const common = { clippingPlanes: planes, clipShadows: false }
  return [
    new THREE.MeshStandardMaterial({ ...common, color: "#f3f2ef", metalness: 0.04, roughness: 0.62 }),
    new THREE.MeshBasicMaterial({ ...common, color: "#8b8b90", toneMapped: false })
  ]
}
