import * as THREE from "three"

const ART_IMAGE: Record<string, string> = {
  USDC: "/images/tokens/usdc.jpg",
  ETH: "/images/tokens/eth.jpg",
  USDT: "/images/tokens/usdt.jpg",
  SOL: "/images/tokens/sol.jpg",
  BNB: "/images/tokens/bnb.jpg",
  LINK: "/images/tokens/link.jpg",
  ARB: "/images/tokens/arb.jpg",
  OP: "/images/tokens/op.jpg",
  PEPE: "/images/tokens/pepe.jpg",
  SHIB: "/images/tokens/shib.jpg",
  DOGE: "/images/tokens/doge.jpg",
  BAYC: "/images/nfts/bayc.jpg",
  AZUKI: "/images/nfts/azuki.jpg",
  DOODLE: "/images/nfts/doodles.jpg",
  MOONBIRD: "/images/nfts/moonbirds.jpg",
  PUDGY: "/images/nfts/pudgy.jpg",
  CLONEX: "/images/nfts/clonex.jpg"
}

export const artImage = (symbol: string): string | null => ART_IMAGE[symbol] ?? null

export type ObjectArt = {
  map: THREE.Texture

  base: THREE.Color
}

const cache = new Map<string, Promise<ObjectArt | null>>()

function sampleBase(img: HTMLImageElement) {
  const c = document.createElement("canvas")
  c.width = 2
  c.height = 2
  const ctx = c.getContext("2d", { willReadFrequently: true })!
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
  return new THREE.Color().setStyle(`rgb(${Math.round(r / 4)}, ${Math.round(g / 4)}, ${Math.round(b / 4)})`)
}

export function loadArt(src: string): Promise<ObjectArt | null> {
  const hit = cache.get(src)
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
    img.onerror = () => resolve(null)
    img.src = src
  })

  cache.set(src, pending)
  return pending
}

export function loadObjectArt(symbol: string): Promise<ObjectArt | null> {
  const src = ART_IMAGE[symbol]
  if (!src) return Promise.resolve(null)
  return loadArt(src)
}
