// The rules for dividing and recombining objects, kept in one place because the grid, the split dock
// and the window manager all have to agree on them.
import type { AssetObj, PackObj } from "@/types/objects"

/** Fungible objects divide; a one-of-one has nothing to split. */
export const isSplittable = (asset: AssetObj) => asset.kind !== "nft" && asset.balance > 0

/** The same holding — same token, same chain. True of an object and itself, which is what the grid's
 *  drag fade wants: the coin in hand shouldn't dim along with the cells it isn't related to. */
export function isSameToken(a: AssetObj, b: AssetObj | PackObj) {
  return b.class === "asset" && a.symbol === b.symbol && a.chain === b.chain
}

/** Two *distinct* objects of one fungible token can be poured back together. Splitting is the only way
 *  a wallet ends up holding the same token twice, so in practice these are always split portions —
 *  matching on the token rather than on split lineage just means it keeps working if they arrive by
 *  some other route. */
export function canCombine(a: AssetObj, b: AssetObj | PackObj): b is AssetObj {
  return isSameToken(a, b) && b.class === "asset" && b.id !== a.id && a.kind !== "nft" && b.kind !== "nft"
}

/** Every asset icon is a potential merge target, so its drop key has to be distinguishable from the
 *  wallets' keys. */
const ASSET_DROP_PREFIX = "asset:"
export const assetDropKey = (id: string) => `${ASSET_DROP_PREFIX}${id}`
export const assetDropId = (key: string) => (key.startsWith(ASSET_DROP_PREFIX) ? key.slice(ASSET_DROP_PREFIX.length) : null)

/** A wallet icon takes any asset — the Send/Trade choice happens in the transfer modal after the drop. */
const WALLET_DROP_PREFIX = "wallet:"
export const walletDropKey = (id: string) => `${WALLET_DROP_PREFIX}${id}`
export const walletDropId = (key: string) => (key.startsWith(WALLET_DROP_PREFIX) ? key.slice(WALLET_DROP_PREFIX.length) : null)

/** A desk folder — takes assets and contacts alike (but never another folder; folders go one level
 *  deep and the folder icons simply never carry this key while one is being moved). */
export const FOLDER_DROP_PREFIX = "folder:"
export const folderDropKey = (id: string) => `${FOLDER_DROP_PREFIX}${id}`
export const folderDropId = (key: string) => (key.startsWith(FOLDER_DROP_PREFIX) ? key.slice(FOLDER_DROP_PREFIX.length) : null)

/** The dock's leading tiles — an asset can be dropped onto those apps. Display-only today: the drop
 *  lands and the icon steps back off the shelf; the app interaction arrives with the dock features. */
const NAV_DROP_PREFIX = "nav:"
export const navDropKey = (id: string) => `${NAV_DROP_PREFIX}${id}`
export const navDropId = (key: string) => (key.startsWith(NAV_DROP_PREFIX) ? key.slice(NAV_DROP_PREFIX.length) : null)
