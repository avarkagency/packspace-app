// PackSpace object system (spec §3.3). Everything important is an object; each class must be
// instantly distinguishable. This prototype models the classes needed for the dashboard +
// Send + Handoff; the rest are present on the canvas as launcher / display objects.
import type { Wallet } from "@/lib/wallets"

export type Chain = "Base" | "Ethereum" | "Solana" | "BNB" | "Bitcoin"

export type ObjectClass = "asset" | "person" | "pack" | "app" | "vault" | "campaign" | "approval"

type ObjBase = {
  id: string
  class: ObjectClass
  label: string
  /** Raw on-chain reference — always reachable on demand (DEV5), never the default view. */
  address?: string
  chain?: Chain
  /** Which of the two self-custody wallets holds this object. Absent reads as Openfort — see lib/wallets. */
  wallet?: Wallet
}

export type AssetKind = "stablecoin" | "token" | "nft" | "stack"

export type AssetObj = ObjBase & {
  class: "asset"
  symbol: string
  kind: AssetKind
  /** Held balance in native units. */
  balance: number
  /** Total USD value of the holding. */
  usd: number
  /** Colour signature so a coin ≠ a coin at a glance. */
  color: string
  /** Commodity assets convert 1-tap to USDC in My Assets (spec §3.7). */
  convertible?: boolean
  /** Absent = a normal, verified token. `false` = not on the verified list (spam/scam airdrop): the
   *  object greys out, its name goes amber, and the Inspector leads with a warning. */
  verified?: boolean
  /** A standing approval this token has granted — the Approval Radar reads these, and an unlimited
   *  allowance to an unverified spender is the classic drain vector. */
  approval?: { spender: string; unlimited: boolean; verified: boolean }
  /** Freshly minted by a split, an unpack, or a Handoff receive — purely informational. */
  derived?: boolean
}

export type TrustState = "unconfirmed" | "confirmed" | "mutual" | "verified"

export type PersonObj = ObjBase & {
  class: "person"
  handle: string
  trust: TrustState
  hue: number
  /** Which shipped avatar this address wears, when it isn't the object's own id. The same person can sit
   *  in both wallets' address books as two objects with two ids — they share one face, so the copy
   *  carries the original's key rather than falling back to the default. */
  avatarKey?: string
  /** Address-lifecycle signals (spec §3.8.4) — the Safety Engine reacts to these. */
  retired?: boolean
  compromised?: boolean
  /** 'g' = a Project G / Openfort smart account: multichain, accepts any asset. 'external' = an EVM/
   *  single-chain address that can only receive assets of its own chain family. Absent → treated as 'g'. */
  platform?: "g" | "external"
  /** External contacts only: whether they're currently connected to PackSpace, so a live Handoff can
   *  reach them (Project G contacts are always reachable). */
  online?: boolean
  /** `false` = an unknown address you've never transacted with (not in your address book): greys out,
   *  name goes amber, and sends warn. Absent/true = a saved contact. */
  whitelisted?: boolean
}

/** One bundled line inside a builder-authored Pack. */
export type PackContent = {
  kind: "asset" | "nft"
  /** The source object it came from, for merge-back on unpack. */
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
  /** The character shown on the pack's face — ★ product, ? randomized, 🔒 locked. */
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
  /** The contract-as-machine label (spec §3.13). */
  machine: string
  /** Integration surface named in the brief — linked, not built, in this prototype. */
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

/** A standing token approval, as the Approval Radar reads it. Distinct from the on-canvas ApprovalObj. */
export type RiskLevel = "ok" | "watch" | "danger"
export type Approval = {
  id: string
  /** The contract/dApp that can spend. */
  spender: string
  verified: boolean
  assetName: string
  symbol: string
  glyph: string
  color: string
  /** Unlimited allowance — the high-risk case. */
  unlimited: boolean
  /** The capped allowance, when not unlimited. */
  allowance?: string
  chain: Chain
  wallet: string
  risk: RiskLevel
  /** The scam token this approval is tied to — revoking removes it from the desk too. */
  assetId?: string
}

/** What sits on the desktop: your holdings on the left, your wallets (contacts) on the right. */
export type DesktopObj = AssetObj | PersonObj

/** A desk folder: a name, the wallet whose desk it sits on, and the ids it holds. Objects in a folder
 *  stay in the flat asset/contact lists — the desk simply doesn't show them, so pulling one out is just
 *  removing its id here. */
export type FolderSpec = { id: string; label: string; wallet: Wallet; contents: string[] }

/** One item in the bottom dock — a flat app tile drawn by the 3D scene (a textured plane, not a coin),
 *  so desktop objects can later be dragged onto it like any other scene object. */
export type NavItem = {
  id: string
  label: string
  icon: string
}

// ── Handoff / Send domain ────────────────────────────────────────────────────

export type Receipt = {
  id: string
  /** Move is the internal one — an object crossing between your own two wallets, not a transfer out. */
  action: "Send" | "Trade" | "Move"
  give: string
  receive?: string
  counterparty: string
  chain: Chain
  hash: string
  confirmation: string
  /** Chain-aware route line ("Base · to their Base account" / "Solana · same chain"). */
  route?: string
  status: "Settled"
  at: string
}
