// The asymmetry that drives most of the rules: Openfort is a smart account and multichain, so it holds
// anything; MetaMask is an EOA on EVM only. An absent `wallet` on an object reads as Openfort, so the
// stock data needs no migration and nothing minting an object has to remember to tag it.
import type { DesktopObj } from "@/types/objects"

import { chainFamily, chainWord, isProjectG } from "./chain"

export type Wallet = "openfort" | "eoa"

/** One wallet on its own, or both side by side. */
export type View = Wallet | "split"

export type WalletSpec = {
  id: Wallet
  label: string
  provider: string
  address: string
  image: string
  evmOnly: boolean
}

export const WALLETS: Record<Wallet, WalletSpec> = {
  openfort: {
    id: "openfort",
    label: "Openfort",
    provider: "Openfort · smart account",
    address: "0x7Afd3C81b9E24f05a6D7c8B1e0F9a2D3c4B5e63D",
    image: "/images/openfort.png",
    evmOnly: false
  },
  eoa: {
    id: "eoa",
    label: "MetaMask",
    provider: "MetaMask · EOA · Base",
    address: "0x2B7d9C40a1E8f36b5D2c7A9e04F1b8C3d6E5a710",
    image: "/images/metamask.png",
    evmOnly: true
  }
}

/** Also the order the split view lays the panes out in. */
export const WALLET_ORDER: Wallet[] = ["openfort", "eoa"]

export const walletOf = (obj: { wallet?: Wallet }): Wallet => obj.wallet ?? "openfort"

export const walletLabel = (w: Wallet) => WALLETS[w].label

export const visibleWallets = (view: View): Wallet[] => (view === "split" ? WALLET_ORDER : [view])

/** Null if it can. Only the EVM-only rule blocks a move — Openfort never refuses anything. */
export function moveBlockMessage(obj: DesktopObj, to: Wallet): string | null {
  if (!WALLETS[to].evmOnly) return null
  const label = WALLETS[to].label

  if (obj.class === "asset") {
    if (chainFamily(obj.chain) === "evm") return null
    return `${label} is an EVM wallet — ${obj.label} (${obj.chain ?? "Base"}) can't be held there. Bridge it to Base first.`
  }

  // a Project G contact is reachable from anywhere; an external address belongs to its own family
  if (isProjectG(obj) || chainFamily(obj.chain) === "evm") return null
  return `${label} only holds EVM addresses — ${obj.label} is a ${chainWord(obj.chain)} address.`
}
