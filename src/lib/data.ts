import type { AppObj, Approval, ApprovalObj, AssetObj, CampaignObj, Chain, NavItem, PackObj, PersonObj, VaultObj } from "./types"

// Dummy data only — no backend, no chain (spec: "full fake product"). Values are illustrative.

// Token colour signatures (data-driven, per doctrine — chrome stays monochrome-cyan).
const C = {
  usdc: "#2775ca",
  eth: "#627eeb",
  usdt: "#1ba27a",
  sol: "#14f195",
  bnb: "#f1b90c",
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

/** Your own PackSpace Card identity — a Project G multichain wallet. */
export const ME = {
  name: "You",
  handle: "@you.pack",
  address: WALLET.address,
  chains: ["Base", "Ethereum", "Solana", "Bitcoin"] as Chain[]
}

/** The session's network, shown in the top bar. A fixture — nothing here actually connects. */
export const CONNECTED_NETWORK: Chain = "Base"

// Ordered as the desk lays them out: columns of five filled top-to-bottom, so this reads column one
// (ETH → 100 USDC) then column two (BNB → BAYC); the Other Tokens folder takes the slot after BAYC.
export const ASSETS: AssetObj[] = [
  {
    id: "a-eth",
    class: "asset",
    label: "Ethereum",
    symbol: "ETH",
    kind: "token",
    balance: 1.35,
    usd: 4821.0,
    chain: "Base",
    color: C.eth,
    convertible: true,
    address: "0x4200000000000000000000000000000000000006"
  },
  {
    id: "a-sol",
    class: "asset",
    label: "Solana",
    symbol: "SOL",
    kind: "token",
    balance: 10204,
    usd: 2918.0,
    chain: "Solana",
    color: C.sol,
    convertible: true,
    address: "So11111111111111111111111111111111111111112"
  },
  {
    id: "a-usdt",
    class: "asset",
    label: "Tether",
    symbol: "USDT",
    kind: "stablecoin",
    balance: 1550,
    usd: 1550.0,
    chain: "Solana",
    color: C.usdt,
    convertible: true,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
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
  // the same token twice on purpose — the dust pile demonstrates drag-to-combine
  {
    id: "a-usdc-dust",
    class: "asset",
    label: "USD Coin",
    symbol: "USDC",
    kind: "stablecoin",
    balance: 100,
    usd: 100.0,
    chain: "Base",
    color: C.usdc,
    convertible: true,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  {
    id: "a-bnb",
    class: "asset",
    label: "BNB",
    symbol: "BNB",
    kind: "token",
    balance: 548,
    usd: 3183.0,
    chain: "BNB",
    color: C.bnb,
    convertible: true,
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52"
  },
  {
    id: "a-usdc",
    class: "asset",
    label: "USD Coin",
    symbol: "USDC",
    kind: "stablecoin",
    balance: 2500,
    usd: 2500.0,
    chain: "Base",
    color: C.usdc,
    convertible: true,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  {
    id: "a-azuki",
    class: "asset",
    label: "Azuki",
    symbol: "AZUKI",
    kind: "nft",
    balance: 1,
    usd: 999.0,
    chain: "Ethereum",
    color: C.azuki,
    address: "0xED5A…4521"
  },
  {
    id: "a-bayc",
    class: "asset",
    label: "Bored Ape Yacht Club",
    symbol: "BAYC",
    kind: "nft",
    balance: 1,
    usd: 150.0,
    chain: "Ethereum",
    color: C.bayc,
    address: "0xBC4C…8817"
  },
  // an unsolicited scam airdrop: unverified, holding an unlimited approval to an unverified contract —
  // it wears the amber treatment, the Inspector warns on it, and the Approval Radar links to it
  {
    id: "a-reward",
    class: "asset",
    label: "$REWARD",
    symbol: "REWARD",
    kind: "token",
    balance: 5000,
    usd: 0,
    chain: "Base",
    color: "#71717a",
    verified: false,
    approval: { spender: "claim-rewards.io", unlimited: true, verified: false },
    address: "0x00c0ffee…5ca3"
  }
]

// Laid out three across, two rows, anchored under the balance card. The two bare addresses are
// counterparties you've transacted with but never saved — their icons wear the warning treatment.
export const PEOPLE: PersonObj[] = [
  {
    id: "p-mum",
    class: "person",
    label: "Mum",
    handle: "@mum.base",
    trust: "mutual",
    hue: 152,
    chain: "Base",
    platform: "g",
    online: true,
    whitelisted: true,
    address: "0x43A6f2C81b9E24f05a6D7c8B1e0F9a2D3c4B5e10"
  },
  {
    id: "p-john",
    class: "person",
    label: "John MetaMask",
    handle: "@john.eth",
    trust: "verified",
    hue: 32,
    chain: "Ethereum",
    platform: "external",
    whitelisted: true,
    address: "0xe02C4b1A7c0D5e6F8a3B2c1D0e9F8a7b6C5d4Aa1"
  },
  {
    id: "p-4f47",
    class: "person",
    label: "0x4F47…",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 210,
    chain: "Base",
    platform: "external",
    whitelisted: false,
    address: "0x4F47b2C81b9E24f05a6D7c8B1e0F9a2D3c4B5c77"
  },
  {
    id: "p-98a3",
    class: "person",
    label: "0x98a3…",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 260,
    chain: "Ethereum",
    platform: "external",
    whitelisted: false,
    address: "0x98a3f2C81b9E24f05a6D7c8B1e0F9a2D3c4B5b19"
  },
  {
    id: "p-binance",
    class: "person",
    label: "Binance Wallet",
    handle: "@binance",
    trust: "confirmed",
    hue: 44,
    chain: "BNB",
    platform: "external",
    online: true,
    whitelisted: true,
    address: "0xfb39a2C81b9E24f05a6D7c8B1e0F9a2D3c4B5d02"
  },
  {
    id: "p-uniswap",
    class: "person",
    label: "Uniswap",
    handle: "@uniswap",
    trust: "verified",
    hue: 320,
    chain: "Ethereum",
    platform: "external",
    whitelisted: true,
    address: "0x9179a2C81b9E24f05a6D7c8B1e0F9a2D3c4B448d"
  }
]

/** The bottom dock, left to right. Labels surface as hover tooltips; the icons themselves are drawn by
 *  the 3D scene so desktop objects can be dropped onto the first two (Pack Builder and Inspector). */
export const NAV_ITEMS: NavItem[] = [
  { id: "nav-builder", label: "Pack Builder", icon: "/images/nav-icons/1.png" },
  { id: "nav-inspector", label: "Inspector", icon: "/images/nav-icons/2.png" },
  { id: "nav-approvals", label: "Approvals", icon: "/images/nav-icons/3.png" },
  { id: "nav-cards", label: "Cards", icon: "/images/nav-icons/4.png" },
  { id: "nav-receipts", label: "Receipts", icon: "/images/nav-icons/5.png" },
  { id: "nav-training", label: "Training", icon: "/images/nav-icons/6.png" },
  { id: "nav-reset", label: "Reset Demo", icon: "/images/nav-icons/7.png" }
]

/** The dust — the long tail of low-value balances. These live inside the Other Tokens folder rather
 *  than on the desk, but they're real assets: pulled out, they behave like any other coin. None have
 *  shipped artwork, so their coins draw their own faces from symbol + colour. */
export const DUST_ASSETS: AssetObj[] = [
  {
    id: "a-link",
    class: "asset",
    label: "Chainlink",
    symbol: "LINK",
    kind: "token",
    balance: 2.4,
    usd: 38.0,
    chain: "Ethereum",
    color: "#2a5ada",
    convertible: true,
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA"
  },
  {
    id: "a-arb",
    class: "asset",
    label: "Arbitrum",
    symbol: "ARB",
    kind: "token",
    balance: 61,
    usd: 24.0,
    chain: "Ethereum",
    color: "#12aaff",
    convertible: true,
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548"
  },
  {
    id: "a-op",
    class: "asset",
    label: "Optimism",
    symbol: "OP",
    kind: "token",
    balance: 14,
    usd: 19.0,
    chain: "Ethereum",
    color: "#ff0420",
    convertible: true,
    address: "0x4200000000000000000000000000000000000042"
  },
  {
    id: "a-pepe",
    class: "asset",
    label: "Pepe",
    symbol: "PEPE",
    kind: "token",
    balance: 900000,
    usd: 9.0,
    chain: "Ethereum",
    color: "#3d8130",
    convertible: true,
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933"
  },
  {
    id: "a-shib",
    class: "asset",
    label: "Shiba Inu",
    symbol: "SHIB",
    kind: "token",
    balance: 400000,
    usd: 5.0,
    chain: "Ethereum",
    color: "#ffa409",
    convertible: true,
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"
  },
  {
    id: "a-doge",
    class: "asset",
    label: "Dogecoin",
    symbol: "DOGE",
    kind: "token",
    balance: 21,
    usd: 3.0,
    chain: "BNB",
    color: "#c2a633",
    convertible: true,
    address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"
  }
]

/** NFT dust — low-value one-of-ones that live in the Other NFTs folder. No shipped artwork, so their
 *  cards draw their own faces (and their folder tiles show tinted squares). */
export const DUST_NFTS: AssetObj[] = [
  {
    id: "a-moonbird",
    class: "asset",
    label: "Moonbirds",
    symbol: "MOONBIRD",
    kind: "nft",
    balance: 1,
    usd: 92.0,
    chain: "Ethereum",
    color: "#8a63d2",
    address: "0x2358…9d21"
  },
  {
    id: "a-pudgy",
    class: "asset",
    label: "Pudgy Penguins",
    symbol: "PUDGY",
    kind: "nft",
    balance: 1,
    usd: 88.0,
    chain: "Ethereum",
    color: "#7fc4e8",
    address: "0xBd35…acB9"
  },
  {
    id: "a-clonex",
    class: "asset",
    label: "CloneX",
    symbol: "CLONEX",
    kind: "nft",
    balance: 1,
    usd: 61.0,
    chain: "Ethereum",
    color: "#e84f4f",
    address: "0x49cF…76e1"
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

export const VAULTS: VaultObj[] = [{ id: "v-lspot", class: "vault", label: "LSPOT Vault", usd: 5000, note: "display-only", color: "#34d399", chain: "Base" }]

export const CAMPAIGNS: CampaignObj[] = [
  { id: "c-neon", class: "campaign", label: "Neon Charizard Drop", note: "live · deploy to roll", color: "#f472b6", chain: "Base" }
]

export const APPROVALS: ApprovalObj[] = [
  { id: "ap-market", class: "approval", label: "PackMarket", app: "PackMarket", scope: "Broad", color: "#f59e0b" },
  { id: "ap-unknown", class: "approval", label: "Unknown Contract", app: "0x00…risk", scope: "Critical", color: "#f43f5e" }
]

/** The standing approvals the Approval Radar shows. The scam entry links to the $REWARD token on the
 *  desk — revoking it removes both the approval and the token. */
export const APPROVAL_RADAR: Approval[] = [
  { id: "ap-uni", spender: "Uniswap", verified: true, assetName: "USD Coin", symbol: "USDC", glyph: "$", color: "#2775ca", unlimited: true, chain: "Base", wallet: "Openfort", risk: "watch" },
  { id: "ap-aave", spender: "Aave", verified: true, assetName: "Ethereum", symbol: "ETH", glyph: "Ξ", color: "#627eeb", unlimited: false, allowance: "2.0", chain: "Ethereum", wallet: "Openfort", risk: "ok" },
  { id: "ap-scam", spender: "claim-rewards.io", verified: false, assetName: "$REWARD", symbol: "REWARD", glyph: "!", color: "#71717a", unlimited: true, chain: "Base", wallet: "Openfort", risk: "danger", assetId: "a-reward" },
  { id: "ap-aero", spender: "Aerodrome", verified: true, assetName: "USD Coin", symbol: "USDC", glyph: "$", color: "#2775ca", unlimited: false, allowance: "640", chain: "Base", wallet: "Openfort", risk: "ok" }
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

export const ALL_OBJECTS = [...ASSETS, ...PEOPLE, ...PACKS, ...APPS, ...VAULTS, ...CAMPAIGNS, ...APPROVALS]

export function objectById(id: string) {
  return ALL_OBJECTS.find((o) => o.id === id)
}
