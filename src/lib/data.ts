import type {
  AppObj,
  ApprovalObj,
  AssetObj,
  CampaignObj,
  PackObj,
  PersonObj,
  VaultObj
} from "./types"

// Dummy data only — no backend, no chain (spec: "full fake product"). Values are illustrative.

// Token colour signatures (data-driven, per doctrine — chrome stays monochrome-cyan).
const C = {
  usdc: "#3b82f6",
  eth: "#8b93ff",
  usdt: "#26a17b",
  sol: "#14f195",
  bnb: "#f0b90b",
  // the polaroids take their colour from their own artwork; these only feed the chrome that still reads
  // objectTint() — the drag label and the coins' fallback faces
  bayc: "#f0a03c",
  azuki: "#e5474b",
  doodles: "#5db4f0",
  stack: "#f472b6"
}

/** The headline's change figure. Invented, like everything else here — nothing in this prototype models
 *  price history, so it's a fixed fixture rather than anything derived from the holdings. */
export const BALANCE_DELTA = { usd: -2.73, pct: -0.26 }

/** You. The address is held in full rather than pre-truncated, because it seeds your avatar as well as
 *  being displayed — the same rule every contact follows. */
export const WALLET = { label: "You", address: "0x7Afd3C81b9E24f05a6D7c8B1e0F9a2D3c4B5e63D" }

export const ASSETS: AssetObj[] = [
  {
    id: "a-usdc",
    class: "asset",
    label: "USD Coin",
    symbol: "USDC",
    kind: "stablecoin",
    balance: 4820.5,
    usd: 4820.5,
    chain: "Base",
    color: C.usdc,
    convertible: true,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  {
    id: "a-eth",
    class: "asset",
    label: "Ethereum",
    symbol: "ETH",
    kind: "token",
    balance: 1.35,
    usd: 4590.0,
    chain: "Base",
    color: C.eth,
    convertible: true,
    address: "0x4200000000000000000000000000000000000006"
  },
  {
    id: "a-usdt",
    class: "asset",
    label: "Tether",
    symbol: "USDT",
    kind: "stablecoin",
    balance: 1200,
    usd: 1200.0,
    chain: "Solana",
    color: C.usdt,
    convertible: true,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  },
  {
    id: "a-sol",
    class: "asset",
    label: "Solana",
    symbol: "SOL",
    kind: "token",
    balance: 42,
    usd: 6300.0,
    chain: "Solana",
    color: C.sol,
    convertible: true,
    address: "So11111111111111111111111111111111111111112"
  },
  {
    id: "a-bnb",
    class: "asset",
    label: "BNB",
    symbol: "BNB",
    kind: "token",
    balance: 3.1,
    usd: 2015.0,
    chain: "BNB",
    color: C.bnb,
    convertible: true,
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52"
  },
  // the three collections are all Ethereum mainnet, as their real counterparts are
  {
    id: "a-bayc",
    class: "asset",
    label: "Bored Ape Yacht Club",
    symbol: "BAYC",
    kind: "nft",
    balance: 1,
    usd: 1450.0,
    chain: "Ethereum",
    color: C.bayc,
    address: "0xBC4C…8817"
  },
  {
    id: "a-azuki",
    class: "asset",
    label: "Azuki",
    symbol: "AZUKI",
    kind: "nft",
    balance: 1,
    usd: 880.0,
    chain: "Ethereum",
    color: C.azuki,
    address: "0xED5A…4521"
  },
  {
    id: "a-doodles",
    class: "asset",
    label: "Doodles",
    symbol: "DOODLE",
    kind: "nft",
    balance: 1,
    usd: 320.0,
    chain: "Ethereum",
    color: C.doodles,
    address: "0x8a90…1893"
  },
  {
    id: "a-stack",
    class: "asset",
    label: "Foil Sleeve",
    symbol: "FOIL",
    kind: "stack",
    balance: 12,
    usd: 240.0,
    chain: "Base",
    color: C.stack,
    address: "0x5c02…1155"
  }
]

export const PEOPLE: PersonObj[] = [
  {
    id: "p-kev",
    class: "person",
    label: "Kev",
    handle: "@kev.base",
    trust: "mutual",
    hue: 172,
    chain: "Base",
    address: "0x2E9f4b1A7c0D5e6F8a3B2c1D0e9F8a7b6C5d4E3f"
  },
  {
    id: "p-mia",
    class: "person",
    label: "Mia — PackMarket",
    handle: "@mia.eth",
    trust: "verified",
    hue: 190,
    chain: "Ethereum",
    address: "0x71C7…9A20"
  },
  {
    id: "p-arc",
    class: "person",
    label: "0xArc",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 210,
    chain: "Base",
    address: "0xA7c3…D19b"
  },
  {
    id: "p-dez",
    class: "person",
    label: "Dez (old wallet)",
    handle: "retired",
    trust: "confirmed",
    hue: 40,
    retired: true,
    chain: "Base",
    address: "0x0dEz…4417"
  },
  {
    id: "p-ghost",
    class: "person",
    label: "ghost.eth",
    handle: "flagged",
    trust: "confirmed",
    hue: 350,
    compromised: true,
    chain: "Ethereum",
    address: "0xdead…beef"
  }
]

export const PACKS: PackObj[] = [
  {
    id: "k-chase",
    class: "pack",
    label: "Chase Pack",
    packClass: "product",
    contents: "3 graded slabs",
    sealed: true,
    usd: 640,
    color: "#22d3ee",
    chain: "Base"
  },
  {
    id: "k-grail",
    class: "pack",
    label: "Grail Box",
    packClass: "randomized",
    contents: "1 chance reveal",
    sealed: true,
    usd: 120,
    color: "#f472b6",
    chain: "Base"
  },
  {
    id: "k-gift",
    class: "pack",
    label: "Gift — Charizard",
    packClass: "product",
    contents: "1 card, sealed",
    sealed: true,
    usd: 410,
    color: "#a78bfa",
    chain: "Base"
  }
]

// The furnished dApp launcher set (spec §3.13). First run is never an empty canvas.
// href = the integration surface named in the brief (§3.15) — linked, not built here.
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

export const VAULTS: VaultObj[] = [
  { id: "v-lspot", class: "vault", label: "LSPOT Vault", usd: 5000, note: "display-only", color: "#34d399", chain: "Base" }
]

export const CAMPAIGNS: CampaignObj[] = [
  { id: "c-neon", class: "campaign", label: "Neon Charizard Drop", note: "live · deploy to roll", color: "#f472b6", chain: "Base" }
]

export const APPROVALS: ApprovalObj[] = [
  { id: "ap-market", class: "approval", label: "PackMarket", app: "PackMarket", scope: "Broad", color: "#f59e0b" },
  { id: "ap-unknown", class: "approval", label: "Unknown Contract", app: "0x00…risk", scope: "Critical", color: "#f43f5e" }
]

// What the fake counterparty is willing to offer back inside a Handoff.
export const COUNTERPARTY_OFFERS: AssetObj[] = [
  {
    id: "cp-zard",
    class: "asset",
    label: "Charizard PSA 10",
    symbol: "ZARD",
    kind: "nft",
    balance: 1,
    usd: 420,
    chain: "Base",
    color: "#fb923c",
    address: "0xZARD…10"
  },
  {
    id: "cp-eth",
    class: "asset",
    label: "Ethereum",
    symbol: "ETH",
    kind: "token",
    balance: 0.15,
    usd: 510,
    chain: "Base",
    color: C.eth,
    address: "0x4200…0006"
  }
]

// Threshold above which a Handoff/Send demands type-to-confirm (spec §3.5.2; value is PS-Q1, open).
export const HIGH_VALUE_USD = 500

export const ALL_OBJECTS = [
  ...ASSETS,
  ...PEOPLE,
  ...PACKS,
  ...APPS,
  ...VAULTS,
  ...CAMPAIGNS,
  ...APPROVALS
]

export function objectById(id: string) {
  return ALL_OBJECTS.find((o) => o.id === id)
}
