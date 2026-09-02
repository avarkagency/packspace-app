// The rules for dividing and recombining objects — the desk, the folders and the windows must agree.
import type { AssetObj, PackObj } from "@/types/objects"

/** Fungible objects divide; a one-of-one has nothing to split. */
export const isSplittable = (asset: AssetObj) => asset.kind !== "nft" && asset.balance > 0

/** Same token, same chain. True of an object and itself — the coin in hand must not dim with the rest. */
export function isSameToken(a: AssetObj, b: AssetObj | PackObj) {
  return b.class === "asset" && a.symbol === b.symbol && a.chain === b.chain
}

/** Matches on token + chain, not split lineage — splitting is the only way a wallet holds one token
 *  twice today, and matching the token keeps working if they ever arrive by another route. */
export function canCombine(a: AssetObj, b: AssetObj | PackObj): b is AssetObj {
  return isSameToken(a, b) && b.class === "asset" && b.id !== a.id && a.kind !== "nft" && b.kind !== "nft"
}

const ASSET_DROP_PREFIX = "asset:"
export const assetDropKey = (id: string) => `${ASSET_DROP_PREFIX}${id}`
export const assetDropId = (key: string) => (key.startsWith(ASSET_DROP_PREFIX) ? key.slice(ASSET_DROP_PREFIX.length) : null)

/** Takes any asset — the Send/Trade choice happens in the transfer modal, after the drop. */
const WALLET_DROP_PREFIX = "wallet:"
export const walletDropKey = (id: string) => `${WALLET_DROP_PREFIX}${id}`
export const walletDropId = (key: string) => (key.startsWith(WALLET_DROP_PREFIX) ? key.slice(WALLET_DROP_PREFIX.length) : null)

/** Assets and contacts alike, but never another folder — folders go one level deep. */
export const FOLDER_DROP_PREFIX = "folder:"
export const folderDropKey = (id: string) => `${FOLDER_DROP_PREFIX}${id}`
export const folderDropId = (key: string) => (key.startsWith(FOLDER_DROP_PREFIX) ? key.slice(FOLDER_DROP_PREFIX.length) : null)

/** Display-only today: the drop lands and the icon steps back off the shelf. */
const NAV_DROP_PREFIX = "nav:"
export const navDropKey = (id: string) => `${NAV_DROP_PREFIX}${id}`
export const navDropId = (key: string) => (key.startsWith(NAV_DROP_PREFIX) ? key.slice(NAV_DROP_PREFIX.length) : null)
