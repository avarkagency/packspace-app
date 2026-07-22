// PackSpace object system (spec §3.3). Everything important is an object; each class must be
// instantly distinguishable. This prototype models the classes needed for the dashboard +
// Send + Handoff; the rest are present on the canvas as launcher / display objects.

export type Chain = "Base" | "Ethereum" | "Solana" | "BNB"

export type ObjectClass = "asset" | "person" | "pack" | "app" | "vault" | "campaign" | "approval"

type ObjBase = {
  id: string
  class: ObjectClass
  label: string
  /** Raw on-chain reference — always reachable on demand (DEV5), never the default view. */
  address?: string
  chain?: Chain
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
}

export type TrustState = "unconfirmed" | "confirmed" | "mutual" | "verified"

export type PersonObj = ObjBase & {
  class: "person"
  handle: string
  trust: TrustState
  hue: number
  /** Address-lifecycle signals (spec §3.8.4) — the Safety Engine reacts to these. */
  retired?: boolean
  compromised?: boolean
}

export type PackObj = ObjBase & {
  class: "pack"
  packClass: "product" | "randomized"
  contents: string
  sealed: boolean
  usd: number
  color: string
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

/** What sits on the desktop: your holdings on the left, your wallets (contacts) on the right. */
export type DesktopObj = AssetObj | PersonObj

/** One item in the bottom dock — a flat app tile drawn by the 3D scene (a textured plane, not a coin),
 *  so desktop objects can later be dragged onto it like any other scene object. */
export type NavItem = {
  id: string
  label: string
  icon: string
}

// ── Handoff / Send domain ────────────────────────────────────────────────────

/** One placed line in a Handoff slot or a Send. */
export type DealItem = {
  key: string
  asset: AssetObj
  amount: number
}

export type Receipt = {
  id: string
  action: "Send" | "Trade"
  give: string
  receive?: string
  counterparty: string
  chain: Chain
  hash: string
  confirmation: string
  status: "Settled"
  at: string
}
