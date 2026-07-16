import * as THREE from "three"

// Real artwork for the objects that have it, keyed by symbol — token marks for coins, collection art for
// the polaroids. Anything without an entry (the stack, the packs) keeps the face the coin drew for
// itself, so the fallback is a live path rather than dead code.
//
// Keyed explicitly rather than derived from the symbol: the filenames happen to lowercase cleanly today,
// but deriving would turn a missing image into a 404 instead of a clean fall back to the drawn face.
const ART_IMAGE: Record<string, string> = {
  USDC: "/images/tokens/usdc.jpg",
  ETH: "/images/tokens/eth.jpg",
  USDT: "/images/tokens/usdt.jpg",
  SOL: "/images/tokens/sol.jpg",
  BNB: "/images/tokens/bnb.jpg",
  BAYC: "/images/nfts/bayc.jpg",
  AZUKI: "/images/nfts/azuki.jpg",
  DOODLE: "/images/nfts/doodles.jpg"
}

/** The same mark, for the DOM to show. Null where a symbol has no art — the callers that need one have
 *  to say what stands in, rather than getting a broken image. */
export const artImage = (symbol: string): string | null => ART_IMAGE[symbol] ?? null

export type ObjectArt = {
  map: THREE.Texture
  /** The artwork's own background, for a coin's rim to sit flush with its face. */
  base: THREE.Color
}

// One load per symbol, shared across every object holding it — split portions of the same token must
// not each fetch and decode their own copy.
const cache = new Map<string, Promise<ObjectArt | null>>()

/** The rim has to match the face or the coin reads as two objects stuck together. A token mark sits on a
 *  flat field, so the image's top-left corner is that field — sample it rather than guessing a tint. */
function sampleBase(img: HTMLImageElement) {
  const c = document.createElement("canvas")
  c.width = 2
  c.height = 2
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  // source rect first: this reads the image's own top-left 2×2, not a 2×2 scaling of the whole thing
  ctx.drawImage(img, 0, 0, 2, 2, 0, 0, 2, 2)
  const d = ctx.getImageData(0, 0, 2, 2).data

  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < 4; i++) {
    r += d[i * 4]
    g += d[i * 4 + 1]
    b += d[i * 4 + 2]
  }
  // setStyle reads sRGB and converts into the renderer's working space, which raw setRGB would skip
  return new THREE.Color().setStyle(`rgb(${Math.round(r / 4)}, ${Math.round(g / 4)}, ${Math.round(b / 4)})`)
}

export function loadObjectArt(symbol: string): Promise<ObjectArt | null> {
  const src = ART_IMAGE[symbol]
  if (!src) return Promise.resolve(null)

  const hit = cache.get(symbol)
  if (hit) return hit

  const pending = new Promise<ObjectArt | null>((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const map = new THREE.Texture(img)
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = 8
      map.needsUpdate = true
      resolve({ map, base: sampleBase(img) })
    }
    // a missing or unreadable file just falls back to the drawn face
    img.onerror = () => resolve(null)
    img.src = src
  })

  cache.set(symbol, pending)
  return pending
}
