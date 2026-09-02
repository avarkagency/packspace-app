import * as THREE from "three"

export const clipPlanes = [
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // keep y < top
  new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // keep y > bottom
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), // keep x > left
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0) // keep x < right
]

export const noClipPlanes = [
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6)
]

export const makeObjectPlanes = () => clipPlanes.map((p) => p.clone())
