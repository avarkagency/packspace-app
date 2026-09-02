// Multichain, NOT cross-chain: assets stay on their native chain and nothing bridges. A wrong-chain send
// to a single-chain external address is blocked, not routed (bridging is Phase 2).
import type { AssetObj, Chain, PersonObj } from "@/types/objects"

export type ChainFamily = "evm" | "solana" | "bitcoin"

/** Base / Ethereum / BNB → evm; Solana → solana; Bitcoin → bitcoin. */
export function chainFamily(chain?: Chain): ChainFamily {
  if (chain === "Solana") return "solana"
  if (chain === "Bitcoin") return "bitcoin"
  return "evm"
}

export function chainWord(chain?: Chain): "Solana" | "Bitcoin" | "EVM" {
  const fam = chainFamily(chain)
  return fam === "solana" ? "Solana" : fam === "bitcoin" ? "Bitcoin" : "EVM"
}

/** Absent platform is treated as Project G. */
export const isProjectG = (contact: PersonObj) => contact.platform !== "external"

/** Project G takes anything; an external address only takes its own chain family. */
export function canReceive(asset: AssetObj, contact: PersonObj): boolean {
  if (isProjectG(contact)) return true
  return chainFamily(asset.chain) === chainFamily(contact.chain)
}

export function blockSendMessage(asset: AssetObj, contact: PersonObj): string {
  const word = chainWord(contact.chain)
  return `${contact.label} is a ${word}-only address — it can't receive ${asset.label} (${asset.chain ?? "Base"}). Send it to a Project G wallet or a matching ${word} address.`
}

export function routeLine(asset: AssetObj, contact: PersonObj): string {
  const chain = asset.chain ?? "Base"
  return isProjectG(contact) ? `${chain} · to their ${chain} account` : `${chain} · same chain`
}

/** Project G contacts read MULTI; everything else tags by its chain; unknown addresses get none. */
const FAMILY_TAG: Record<ChainFamily, { label: string; color: string }> = {
  evm: { label: "EVM", color: "#7d9bff" },
  solana: { label: "SOL", color: "#31d0a5" },
  bitcoin: { label: "BTC", color: "#f7a13a" }
}
const MULTI_TAG = { label: "MULTI", color: "#c4b6ff" }

export function chainTag(obj: AssetObj | PersonObj): { label: string; color: string } | null {
  if (obj.class === "asset") return FAMILY_TAG[chainFamily(obj.chain)]
  if (obj.whitelisted === false) return null
  if (isProjectG(obj)) return MULTI_TAG
  return FAMILY_TAG[chainFamily(obj.chain)]
}
