// A folder holds ids only — its contents stay in the flat lists, so pulling one out just removes an id.
import type { FolderSpec } from "@/types/objects"

import { DUST_ASSETS, DUST_NFTS } from "./assets"

export const FOLDER_ID = "folder-other"

/** A module constant, so the initial layout effect can lay out the desk without depending on state. */
export const INITIAL_FOLDERS: FolderSpec[] = [
  { id: FOLDER_ID, label: "Other tokens", wallet: "openfort", contents: DUST_ASSETS.map((a) => a.id) },
  { id: "folder-other-nfts", label: "Other NFTs", wallet: "openfort", contents: DUST_NFTS.map((a) => a.id) }
]
