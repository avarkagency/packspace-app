import { createElement } from "react"

import type { CanvasObj, Chain } from "@/types/objects"
import {
  Archive,
  Box,
  CircleDollarSign,
  Coins,
  Gem,
  Layers,
  type LucideIcon,
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
  Vault
} from "lucide-react"

// Each object class renders instantly distinct (spec §3.1): distinct icon + colour + silhouette.

/** Network marks, keyed rather than derived from the chain's name — the filenames happen to lowercase
 *  cleanly today, but a chain whose mark isn't named after it would break that silently. */
const CHAIN_IMAGE: Record<Chain, string> = {
  Base: "/images/chains/base.jpg",
  Ethereum: "/images/chains/ethereum.jpg",
  Solana: "/images/chains/solana.jpg",
  BNB: "/images/chains/bnb.jpg",
  // no Bitcoin assets in the seed set yet — mark carries no art, only satisfies the exhaustive map
  Bitcoin: "/images/chains/bitcoin.jpg"
}

export const chainImage = (chain: Chain) => CHAIN_IMAGE[chain]

/** Contact avatar art, keyed by contact id. Anyone without shipped art (the bare 0x… addresses, imported
 *  contacts) falls back to a default face rather than a broken image. */
const CONTACT_IMAGE: Record<string, string> = {
  "p-mum": "/images/contacts/mum.jpg",
  "p-john": "/images/contacts/john.jpg",
  "p-binance": "/images/contacts/binance.jpg",
  "p-uniswap": "/images/contacts/uniswap.jpg"
}

/** The face an address wears. Takes the contact rather than a bare id so a copy of it — the same person
 *  in the other wallet's address book, which needs its own object id — keeps the original's avatar
 *  through `avatarKey` instead of dropping to the default. */
export const contactImage = (contact: { id: string; avatarKey?: string }) => CONTACT_IMAGE[contact.avatarKey ?? contact.id] ?? "/images/contacts/default.jpg"

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

/** The object's name-text colour, colour-coded by class so a glance separates a token from a contact
 *  from a pack. Unverified tokens and unknown addresses override to amber — the same signal the coin's
 *  dashed outline and warning badge carry. Matches the prototype's `nameColor`/`COL` map. */
const NAME_COLOR: Record<string, string> = {
  asset: "#ffffff",
  nft: "#f3c6ec",
  contact: "#9fd0ff",
  app: "#d6c3ff",
  pack: "#ffd7a3",
  vault: "#cbd6e6",
  campaign: "#b6efc4"
}
const AMBER = "#f7c86a"

export function objectNameColor(obj: CanvasObj): string {
  if (obj.class === "asset") {
    if (obj.verified === false) return AMBER
    return obj.kind === "nft" ? NAME_COLOR.nft : NAME_COLOR.asset
  }
  if (obj.class === "person") return obj.whitelisted === false ? AMBER : NAME_COLOR.contact
  return NAME_COLOR[obj.class] ?? "#ffffff"
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
