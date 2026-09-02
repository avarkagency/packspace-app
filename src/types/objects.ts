import type { Wallet } from "@/lib/wallets"

export type Chain = "Base" | "Ethereum" | "Solana" | "BNB" | "Bitcoin"

export type ObjectClass = "asset" | "person" | "pack" | "app" | "vault" | "campaign" | "approval"

type ObjBase = {
  id: string
  class: ObjectClass
  label: string
  address?: string
  chain?: Chain
  wallet?: Wallet
}

export type AssetKind = "stablecoin" | "token" | "nft" | "stack"

export type AssetObj = ObjBase & {
  class: "asset"
  symbol: string
  kind: AssetKind
  balance: number
  usd: number
  color: string
  convertible?: boolean
  verified?: boolean
  approval?: { spender: string; unlimited: boolean; verified: boolean }
  derived?: boolean
}

export type TrustState = "unconfirmed" | "confirmed" | "mutual" | "verified"

export type PersonObj = ObjBase & {
  class: "person"
  handle: string
  trust: TrustState
  hue: number
  avatarKey?: string
  retired?: boolean
  compromised?: boolean
  platform?: "g" | "external"
  online?: boolean
  whitelisted?: boolean
}

export type PackContent = {
  kind: "asset" | "nft"
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
  packType?: "Product" | "Randomized" | "Transit"
  standard?: string
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
  machine: string
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
  allowance?: string
  chain: Chain
  wallet: string
  risk: RiskLevel
  assetId?: string
}

export type DesktopObj = AssetObj | PersonObj
export type FolderSpec = { id: string; label: string; wallet: Wallet; contents: string[] }

export type NavItem = {
  id: string
  label: string
  icon: string
}

export type Receipt = {
  id: string
  action: "Send" | "Trade" | "Move"
  give: string
  receive?: string
  counterparty: string
  chain: Chain
  hash: string
  confirmation: string
  route?: string
  status: "Settled"
  at: string
}
