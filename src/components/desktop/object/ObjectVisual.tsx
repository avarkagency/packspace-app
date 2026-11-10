import { createElement } from "react"

import type { CanvasObj, Chain } from "@/types/objects"
import { gradientToDataURL } from "@outpacelabs/avatars"
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

const CHAIN_IMAGE: Record<Chain, string> = {
  Base: "/images/chains/base.jpg",
  Ethereum: "/images/chains/ethereum.jpg",
  Solana: "/images/chains/solana.jpg",
  BNB: "/images/chains/bnb.jpg",
  Bitcoin: "/images/chains/bitcoin.jpg"
}

export const chainImage = (chain: Chain) => CHAIN_IMAGE[chain]

const CONTACT_IMAGE: Record<string, string> = {
  "p-mum": "/images/contacts/mum.jpg",
  "p-john": "/images/contacts/john.jpg",
  "p-binance": "/images/contacts/binance.jpg",
  "p-uniswap": "/images/contacts/uniswap.jpg"
}

/** `photo` is an override for a face that isn't a fixture — your own uploaded PFP. */
export type AvatarSubject = { id: string; avatarKey?: string; address?: string; photo?: string | null }

export const contactPhoto = (contact: AvatarSubject) => contact.photo ?? CONTACT_IMAGE[contact.avatarKey ?? contact.id] ?? null

export const avatarSeed = (contact: AvatarSubject) => contact.address ?? contact.id

const gradients = new Map<string, string>()

/** The 3D layer needs a URL, so a face without a photo is its address gradient baked to a data URL. Browser only. */
export function contactImage(contact: AvatarSubject) {
  const photo = contactPhoto(contact)
  if (photo) return photo
  const seed = avatarSeed(contact)
  let url = gradients.get(seed)
  if (!url) {
    url = gradientToDataURL(seed, { size: 256 })
    gradients.set(seed, url)
  }
  return url
}

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

export function ObjectIcon({ obj, className, strokeWidth }: { obj: CanvasObj; className?: string; strokeWidth?: number }) {
  return createElement(objectIcon(obj), { className, strokeWidth })
}

function objectIcon(obj: CanvasObj): LucideIcon {
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

export function objectTint(obj: CanvasObj): string {
  if ("color" in obj && obj.color) return obj.color
  if (obj.class === "person") return `hsl(${obj.hue} 80% 62%)`
  return "#22d3ee"
}

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
