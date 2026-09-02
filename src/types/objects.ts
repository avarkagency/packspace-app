// The object system (spec §3.3). Everything important is an object.
import type { Wallet } from "@/lib/wallets"

export type Chain = "Base" | "Ethereum" | "Solana" | "BNB" | "Bitcoin"

export type ObjectClass = "asset" | "person" | "pack" | "app" | "vault" | "campaign" | "approval"

type ObjBase = {
  id: string
  class: ObjectClass
  label: string
  /** Always reachable on demand (DEV5), never the default view. */
  address?: string
  chain?: Chain
  /** Absent reads as Openfort. */
  wallet?: Wallet
}

export type AssetKind = "stablecoin" | "token" | "nft" | "stack"

export type AssetObj = ObjBase & {
  class: "asset"
  symbol: string
  kind: AssetKind
  /** Native units, not USD. */
  balance: number
  usd: number
  color: string
  /** Converts 1-tap to USDC (spec §3.7). */
  convertible?: boolean
  /** Absent = verified. `false` = a spam/scam airdrop: greys out, name goes amber, Inspector warns. */
  verified?: boolean
  /** An unlimited allowance to an unverified spender is the classic drain vector. */
  approval?: { spender: string; unlimited: boolean; verified: boolean }
  /** Minted by a split, unpack or Handoff receive. Informational only. */
  derived?: boolean
}

export type TrustState = "unconfirmed" | "confirmed" | "mutual" | "verified"

export type PersonObj = ObjBase & {
  class: "person"
  handle: string
  trust: TrustState
  hue: number
  /** One person can sit in both address books as two ids; the copy carries the original's key so they
   *  share a face rather than falling back to the default. */
  avatarKey?: string
  /** Spec §3.8.4 — the Safety Engine reacts to these. */
  retired?: boolean
  compromised?: boolean
  /** 'g' is multichain and accepts anything; 'external' only its own chain family. Absent = 'g'. */
  platform?: "g" | "external"
  /** External contacts only — Project G ones are always reachable. */
  online?: boolean
  /** `false` = an unknown address: greys out, name goes amber, sends warn. Absent/true = saved. */
  whitelisted?: boolean
}

export type PackContent = {
  kind: "asset" | "nft"
  /** For merge-back on unpack. */
  refId?: string
  label: string
  symbol: string
  glyph?: string
  color: string
  amount: number
  usd: number
  chain?: Chain
}

export type PackObj = ObjBase & {
  class: "pack"
  packClass: "product" | "randomized"
  contents: string
  sealed: boolean
  usd: number
  color: string
  // ── builder-authored packs carry the richer runtime shape ──
  packType?: "Product" | "Randomized" | "Transit"
  standard?: string
  /** ★ product, ? randomized, 🔒 locked. */
  packGlyph?: string
  meta?: string
  locked?: boolean
  lockKind?: "None" | "Password"
  password?: string
  items?: PackContent[]
}

export type AppKind = "gacha" | "bag" | "aboyz" | "packmarket" | "handoff" | "lspot" | "approval-radar" | "pack-builder"

export type AppObj = ObjBase & {
  class: "app"
  appKind: AppKind
  /** Contract-as-machine (spec §3.13). */
  machine: string
  /** Linked, not built. */
  href: string
  color: string
}

export type VaultObj = ObjBase & {
  class: "vault"
  usd: number
  note: string
  color: string
}
export type CampaignObj = ObjBase & {
  class: "campaign"
  note: string
  color: string
}
export type ApprovalObj = ObjBase & {
  class: "approval"
  app: string
  scope: "Safe" | "Limited" | "Broad" | "Unlimited" | "Unknown Contract" | "Critical"
  color: string
}

export type CanvasObj = AssetObj | PersonObj | PackObj | AppObj | VaultObj | CampaignObj | ApprovalObj

/** As the Approval Radar reads it. Distinct from the on-canvas ApprovalObj. */
export type RiskLevel = "ok" | "watch" | "danger"
export type Approval = {
  id: string
  spender: string
  verified: boolean
  assetName: string
  symbol: string
  glyph: string
  color: string
  unlimited: boolean
  /** Present only when not unlimited. */
  allowance?: string
  chain: Chain
  wallet: string
  risk: RiskLevel
  /** Revoking removes this token from the desk too. */
  assetId?: string
}

export type DesktopObj = AssetObj | PersonObj

/** Contents stay in the flat asset/contact lists — the desk just doesn't show them. */
export type FolderSpec = { id: string; label: string; wallet: Wallet; contents: string[] }

/** Drawn by the 3D scene as a flat plane, so objects can be dragged onto it like any other. */
export type NavItem = {
  id: string
  label: string
  icon: string
}

// ── Handoff / Send domain ────────────────────────────────────────────────────

export type Receipt = {
  id: string
  /** Move is internal — between your own two wallets, not a transfer out. */
  action: "Send" | "Trade" | "Move"
  give: string
  receive?: string
  counterparty: string
  chain: Chain
  hash: string
  confirmation: string
  /** "Base · to their Base account" / "Solana · same chain". */
  route?: string
  status: "Settled"
  at: string
}
