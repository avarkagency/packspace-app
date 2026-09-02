// The desk folders the workspace starts with. A folder holds ids only — the objects it contains stay
// in the flat asset/contact lists, and the desk simply doesn't show them, so pulling one out is just
// removing its id here.
import type { FolderSpec } from "@/types/objects"

import { DUST_ASSETS, DUST_NFTS } from "./assets"

/** The Other Tokens folder's desk id. */
export const FOLDER_ID = "folder-other"

/** First run: the token dust lives in Other Tokens, the NFT dust in Other NFTs — both on the Openfort
 *  desk, which is where that dust is held. MetaMask starts with no folders of its own. A module constant
 *  so the initial layout effect can lay out the desk without depending on folder state. */
export const INITIAL_FOLDERS: FolderSpec[] = [
  { id: FOLDER_ID, label: "Other tokens", wallet: "openfort", contents: DUST_ASSETS.map((a) => a.id) },
  { id: "folder-other-nfts", label: "Other NFTs", wallet: "openfort", contents: DUST_NFTS.map((a) => a.id) }
]
