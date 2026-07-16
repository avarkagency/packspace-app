import * as THREE from "three"

// Clip sources shared by every object in the grid. Resting objects clip to the grid's scroll viewport;
// one in hand has to fly over the chrome, so it reads from the pushed-out set instead.
//
// Each object copies from one of these into its *own* planes array every frame — the array reference a
// material holds never changes, so swapping clip modes can never trigger a shader recompile.

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
