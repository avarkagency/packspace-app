import type { AssetObj } from "@/types/objects"

import { C } from "./colors"

// Dummy data only — no backend, no chain (spec: "full fake product"). Values are illustrative.

/** 24h price change per token, in percent — the green/red tag inside an asset's price pill. Keyed by
 *  symbol, not holding: the USDC dust pile moves exactly as the main pile does. Invented, like everything
 *  else here — nothing in this prototype models price history. */
const CHANGE_24H: Record<string, number> = {
  ETH: 2.4,
  SOL: -1.8,
  USDT: 0.0,
  USDC: 0.0,
  BNB: 0.9,
  DOODLE: -3.2,
  AZUKI: 5.1,
  BAYC: -2.6,
  LINK: 1.3,
  ARB: -0.7,
  OP: 3.8,
  PEPE: -6.4,
  SHIB: 1.9,
  DOGE: -0.5,
  MOONBIRD: 4.2,
  PUDGY: -1.1,
  CLONEX: -4.8,
  ZARD: 12.6
}

/** The tag-worthy 24h move for a token. Flat movers (stablecoins) and unknown symbols (the scam
 *  airdrop) return undefined — they wear no tag rather than a meaningless one. */
export function dayChange(symbol: string): number | undefined {
  const pct = CHANGE_24H[symbol]
  return pct === undefined || Math.abs(pct) < 0.05 ? undefined : pct
}

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

// ── The MetaMask (EOA) desk ──────────────────────────────────────────────────
// The second self-custody wallet, ported from the design prototype's EOA set. MetaMask is an EOA on EVM
// only, so everything here is Base or Ethereum — nothing on Solana or Bitcoin can be held in it, which
// is the rule the split view's divider enforces when you drag something across.
//
// USDC deliberately appears in BOTH wallets: moving one onto the other is what raises the merge prompt.

export const EOA_ASSETS: AssetObj[] = [
  {
    id: "e-cbeth",
    class: "asset",
    label: "Coinbase Wrapped Staked ETH",
    symbol: "cbETH",
    kind: "token",
    balance: 1.1,
    usd: 3200.0,
    chain: "Base",
    color: "#3b82f6",
    wallet: "eoa",
    address: "0x2Ae3…F1b7"
  },
  {
    id: "e-usdc",
    class: "asset",
    label: "USD Coin",
    symbol: "USDC",
    kind: "stablecoin",
    balance: 640,
    usd: 640.0,
    chain: "Base",
    color: C.usdc,
    wallet: "eoa",
    approval: { spender: "Aerodrome", unlimited: false, verified: true },
    address: "0x8335…2913"
  },
  {
    id: "e-degen",
    class: "asset",
    label: "Degen",
    symbol: "DEGEN",
    kind: "token",
    balance: 4200,
    usd: 185.0,
    chain: "Base",
    color: "#a855f7",
    wallet: "eoa",
    address: "0x4ed4…9Ed"
  },
  {
    id: "e-aero",
    class: "asset",
    label: "Aerodrome",
    symbol: "AERO",
    kind: "token",
    balance: 310,
    usd: 520.0,
    chain: "Base",
    color: "#38bdf8",
    wallet: "eoa",
    address: "0x9401…f631"
  },
  {
    id: "e-bayc",
    class: "asset",
    label: "Bored Ape Yacht Club",
    symbol: "BAYC",
    kind: "nft",
    balance: 1,
    usd: 148.0,
    chain: "Ethereum",
    color: C.bayc,
    wallet: "eoa",
    address: "0xBC4C…2044"
  },
  {
    id: "e-pudgy",
    class: "asset",
    label: "Pudgy Penguins",
    symbol: "PUDGY",
    kind: "nft",
    balance: 1,
    usd: 96.0,
    chain: "Ethereum",
    color: "#7fc4e8",
    wallet: "eoa",
    address: "0xBd35…7c19"
  }
]
