import type { AssetObj, PackObj } from "@/types/objects"

export const isSplittable = (asset: AssetObj) => asset.kind !== "nft" && asset.balance > 0

export function isSameToken(a: AssetObj, b: AssetObj | PackObj) {
  return b.class === "asset" && a.symbol === b.symbol && a.chain === b.chain
}

export function canCombine(a: AssetObj, b: AssetObj | PackObj): b is AssetObj {
  return isSameToken(a, b) && b.class === "asset" && b.id !== a.id && a.kind !== "nft" && b.kind !== "nft"
}

const ASSET_DROP_PREFIX = "asset:"
export const assetDropKey = (id: string) => `${ASSET_DROP_PREFIX}${id}`
export const assetDropId = (key: string) => (key.startsWith(ASSET_DROP_PREFIX) ? key.slice(ASSET_DROP_PREFIX.length) : null)

const WALLET_DROP_PREFIX = "wallet:"
export const walletDropKey = (id: string) => `${WALLET_DROP_PREFIX}${id}`
export const walletDropId = (key: string) => (key.startsWith(WALLET_DROP_PREFIX) ? key.slice(WALLET_DROP_PREFIX.length) : null)

export const FOLDER_DROP_PREFIX = "folder:"
export const folderDropKey = (id: string) => `${FOLDER_DROP_PREFIX}${id}`
export const folderDropId = (key: string) => (key.startsWith(FOLDER_DROP_PREFIX) ? key.slice(FOLDER_DROP_PREFIX.length) : null)

const NAV_DROP_PREFIX = "nav:"
export const navDropKey = (id: string) => `${NAV_DROP_PREFIX}${id}`
export const navDropId = (key: string) => (key.startsWith(NAV_DROP_PREFIX) ? key.slice(NAV_DROP_PREFIX.length) : null)
