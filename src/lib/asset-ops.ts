import type { AssetObj, PackObj } from "@/types/objects"

export const isSplittable = (asset: AssetObj) => asset.kind !== "nft" && asset.balance > 0

export function isSameToken(a: AssetObj, b: AssetObj | PackObj) {
  return b.class === "asset" && a.symbol === b.symbol && a.chain === b.chain
}

export function canCombine(a: AssetObj, b: AssetObj | PackObj): b is AssetObj {
  return isSameToken(a, b) && b.class === "asset" && b.id !== a.id && a.kind !== "nft" && b.kind !== "nft"
}

/** Every icon is a potential drop target, so the prefix is what tells the handlers apart. */
function dropKind(prefix: string) {
  return {
    prefix,
    key: (id: string) => `${prefix}${id}`,
    id: (key: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : null)
  }
}

const asset = dropKind("asset:")
const wallet = dropKind("wallet:")
const folder = dropKind("folder:")
const nav = dropKind("nav:")

export const assetDropKey = asset.key
export const assetDropId = asset.id

export const walletDropKey = wallet.key
export const walletDropId = wallet.id

export const FOLDER_DROP_PREFIX = folder.prefix
export const folderDropKey = folder.key
export const folderDropId = folder.id

export const navDropKey = nav.key
export const navDropId = nav.id

const STABLECOINS = new Set(["USDC", "USDT"])

/** What a minted holding counts as — anything unpacked, received or claimed comes back through here. */
export const assetKindFor = (symbol: string): AssetObj["kind"] => (STABLECOINS.has(symbol) ? "stablecoin" : "token")
