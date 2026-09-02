import type { Approval, ApprovalObj } from "@/types/objects"

export const APPROVALS: ApprovalObj[] = [
  { id: "ap-market", class: "approval", label: "PackMarket", app: "PackMarket", scope: "Broad", color: "#f59e0b" },
  { id: "ap-unknown", class: "approval", label: "Unknown Contract", app: "0x00…risk", scope: "Critical", color: "#f43f5e" }
]

/** The scam entry links to the $REWARD token on the desk — revoking removes both. */
export const APPROVAL_RADAR: Approval[] = [
  {
    id: "ap-uni",
    spender: "Uniswap",
    verified: true,
    assetName: "USD Coin",
    symbol: "USDC",
    glyph: "$",
    color: "#2775ca",
    unlimited: true,
    chain: "Base",
    wallet: "Openfort",
    risk: "watch"
  },
  {
    id: "ap-aave",
    spender: "Aave",
    verified: true,
    assetName: "Ethereum",
    symbol: "ETH",
    glyph: "Ξ",
    color: "#627eeb",
    unlimited: false,
    allowance: "2.0",
    chain: "Ethereum",
    wallet: "Openfort",
    risk: "ok"
  },
  {
    id: "ap-scam",
    spender: "claim-rewards.io",
    verified: false,
    assetName: "$REWARD",
    symbol: "REWARD",
    glyph: "!",
    color: "#71717a",
    unlimited: true,
    chain: "Base",
    wallet: "Openfort",
    risk: "danger",
    assetId: "a-reward"
  },
  {
    id: "ap-aero",
    spender: "Aerodrome",
    verified: true,
    assetName: "USD Coin",
    symbol: "USDC",
    glyph: "$",
    color: "#2775ca",
    unlimited: false,
    allowance: "640",
    chain: "Base",
    wallet: "MetaMask",
    risk: "ok"
  }
]
