// The multichain (NOT cross-chain) compatibility model, ported verbatim from the design prototype.
// Assets stay on their native chain; nothing bridges. A Project G wallet is multichain and accepts
// anything; an external address only receives assets of its own chain family. Wrong-chain sends to a
// single-chain external address are blocked — no bridging is performed (that's Phase 2).
import type { AssetObj, Chain, PersonObj } from "@/types/objects"

export type ChainFamily = "evm" | "solana" | "bitcoin"

/** Base / Ethereum / BNB → evm; Solana → solana; Bitcoin → bitcoin. */
export function chainFamily(chain?: Chain): ChainFamily {
  if (chain === "Solana") return "solana"
  if (chain === "Bitcoin") return "bitcoin"
  return "evm"
}

/** The word a wrong-chain message uses for a contact's family. */
export function chainWord(chain?: Chain): "Solana" | "Bitcoin" | "EVM" {
  const fam = chainFamily(chain)
  return fam === "solana" ? "Solana" : fam === "bitcoin" ? "Bitcoin" : "EVM"
}

/** A Project G / Openfort smart account is multichain. Absent platform is treated as Project G. */
export const isProjectG = (contact: PersonObj) => contact.platform !== "external"

/** Can this contact receive this asset? Project G takes anything; an external address only takes assets
 *  of its own chain family. */
export function canReceive(asset: AssetObj, contact: PersonObj): boolean {
  if (isProjectG(contact)) return true
  return chainFamily(asset.chain) === chainFamily(contact.chain)
}

/** The block-message shown when an incompatible asset is sent to a single-chain external address. */
export function blockSendMessage(asset: AssetObj, contact: PersonObj): string {
  const word = chainWord(contact.chain)
  return `${contact.label} is a ${word}-only address — it can't receive ${asset.label} (${asset.chain ?? "Base"}). Send it to a Project G wallet or a matching ${word} address.`
}

/** The Transaction Interpreter's "Network" value — what the recipient side of a Send looks like. */
export function networkLine(asset: AssetObj, contact: PersonObj): string {
  const chain = asset.chain ?? "Base"
  return isProjectG(contact) ? `${chain} · to a multichain wallet` : `${chain} · same chain`
}

/** The receipt's chain-aware Route row. */
export function routeLine(asset: AssetObj, contact: PersonObj): string {
  const chain = asset.chain ?? "Base"
  return isProjectG(contact) ? `${chain} · to their ${chain} account` : `${chain} · same chain`
}

/** The chain-family tag pill shown in the hover readout's Network row. Assets tag by their chain;
 *  Project G contacts read MULTI; external contacts tag by their chain; unknown addresses get none. */
export const FAMILY_TAG: Record<ChainFamily, { label: string; color: string }> = {
  evm: { label: "EVM", color: "#7d9bff" },
  solana: { label: "SOL", color: "#31d0a5" },
  bitcoin: { label: "BTC", color: "#f7a13a" }
}
export const MULTI_TAG = { label: "MULTI", color: "#c4b6ff" }

export function chainTag(obj: AssetObj | PersonObj): { label: string; color: string } | null {
  if (obj.class === "asset") return FAMILY_TAG[chainFamily(obj.chain)]
  if (obj.whitelisted === false) return null
  if (isProjectG(obj)) return MULTI_TAG
  return FAMILY_TAG[chainFamily(obj.chain)]
}
