import { createElement } from "react"

import {
  Archive,
  Box,
  CircleDollarSign,
  Coins,
  Gem,
  Layers,
  Package,
  PackageOpen,
  Radar,
  ScanLine,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  User,
  Vault,
  type LucideIcon
} from "lucide-react"

import type { CanvasObj, Chain } from "@/lib/types"

// Each object class renders instantly distinct (spec §3.1): distinct icon + colour + silhouette.

/** Network marks, keyed rather than derived from the chain's name — the filenames happen to lowercase
 *  cleanly today, but a chain whose mark isn't named after it would break that silently. */
const CHAIN_IMAGE: Record<Chain, string> = {
  Base: "/images/chains/base.jpg",
  Ethereum: "/images/chains/ethereum.jpg",
  Solana: "/images/chains/solana.jpg",
  BNB: "/images/chains/bnb.jpg"
}

export const chainImage = (chain: Chain) => CHAIN_IMAGE[chain]

const APP_ICON: Record<string, LucideIcon> = {
  gacha: Ticket,
  bag: ShoppingBag,
  aboyz: PackageOpen,
  packmarket: Store,
  handoff: Layers,
  lspot: Vault,
  "approval-radar": Radar,
  "pack-builder": Package
}

const ASSET_ICON = {
  stablecoin: CircleDollarSign,
  token: Coins,
  nft: Gem,
  stack: Layers
} as const

/**
 * Renders an object's icon. Uses createElement so the dynamically-chosen component is never
 * declared as a JSX tag during render (satisfies the strict react-hooks/static-components rule).
 */
export function ObjectIcon({ obj, className, strokeWidth }: { obj: CanvasObj; className?: string; strokeWidth?: number }) {
  return createElement(objectIcon(obj), { className, strokeWidth })
}

export function objectIcon(obj: CanvasObj): LucideIcon {
  switch (obj.class) {
    case "asset":
      return ASSET_ICON[obj.kind]
    case "person":
      return User
    case "pack":
      return Box
    case "app":
      return APP_ICON[obj.appKind] ?? Package
    case "vault":
      return Vault
    case "campaign":
      return Sparkles
    case "approval":
      return obj.scope === "Critical" ? ShieldAlert : ScanLine
    default:
      return Archive
  }
}

/** The object's accent colour (data-driven). Used for the icon chip + hover glow. */
export function objectTint(obj: CanvasObj): string {
  if ("color" in obj && obj.color) return obj.color
  if (obj.class === "person") return `hsl(${obj.hue} 80% 62%)`
  return "#22d3ee"
}

/** The class label shown as the object's category tag. */
export function objectKindLabel(obj: CanvasObj): string {
  switch (obj.class) {
    case "asset":
      return obj.kind === "nft" ? "NFT" : obj.kind === "stack" ? "1155 stack" : obj.kind
    case "person":
      return "contact"
    case "pack":
      return obj.packClass === "randomized" ? "randomized pack" : "product pack"
    case "app":
      return obj.machine
    case "vault":
      return "vault"
    case "campaign":
      return "campaign"
    case "approval":
      return "approval"
    default:
      return "object"
  }
}
