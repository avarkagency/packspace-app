import type { AppObj, CampaignObj, NavItem, VaultObj } from "@/types/objects"

/** Left to right. The icons are drawn by the 3D scene, so objects can be dropped onto the first two. */
export const NAV_ITEMS: NavItem[] = [
  { id: "nav-builder", label: "Pack Builder", icon: "/images/nav-icons/1.png" },
  { id: "nav-inspector", label: "Inspector", icon: "/images/nav-icons/2.png" },
  { id: "nav-approvals", label: "Approvals", icon: "/images/nav-icons/3.png" },
  { id: "nav-cards", label: "Cards", icon: "/images/nav-icons/4.png" },
  { id: "nav-receipts", label: "Receipts", icon: "/images/nav-icons/5.png" },
  { id: "nav-training", label: "Training", icon: "/images/nav-icons/6.png" },
  { id: "nav-reset", label: "Reset Demo", icon: "/images/nav-icons/7.png" }
]

// The launcher set (spec §3.13) — first run is never an empty canvas. href is linked, not built here.
export const APPS: AppObj[] = [
  { id: "app-gacha", class: "app", label: "Gacha Labs", appKind: "gacha", machine: "campaign machine", href: "https://gachalabs.example", color: "#f472b6" },
  { id: "app-bag", class: "app", label: "BAG", appKind: "bag", machine: "dispenser", href: "https://bag.example", color: "#f59e0b" },
  { id: "app-aboyz", class: "app", label: "Aboyz", appKind: "aboyz", machine: "pack ripper", href: "http://localhost:3000", color: "#22d3ee" },
  { id: "app-market", class: "app", label: "PackMarket", appKind: "packmarket", machine: "shop counter", href: "https://packmarket.example", color: "#2dd4bf" },
  { id: "app-handoff", class: "app", label: "Handoff", appKind: "handoff", machine: "trade table", href: "#", color: "#22d3ee" },
  { id: "app-lspot", class: "app", label: "LSPOT", appKind: "lspot", machine: "vault (display-only)", href: "https://lspot.example", color: "#34d399" },
  { id: "app-radar", class: "app", label: "Approval Radar", appKind: "approval-radar", machine: "scanner", href: "#", color: "#f59e0b" },
  { id: "app-builder", class: "app", label: "Pack Builder", appKind: "pack-builder", machine: "packing machine", href: "#", color: "#a78bfa" }
]

export const VAULTS: VaultObj[] = [{ id: "v-lspot", class: "vault", label: "LSPOT Vault", usd: 5000, note: "display-only", color: "#34d399", chain: "Base" }]

export const CAMPAIGNS: CampaignObj[] = [
  { id: "c-neon", class: "campaign", label: "Neon Charizard Drop", note: "live · deploy to roll", color: "#f472b6", chain: "Base" }
]
