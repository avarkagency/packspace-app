// The two self-custody wallets the workspace spans, and the view that shows them side by side.
//
// Every object on the desk belongs to exactly one wallet. An absent `wallet` reads as Openfort, so the
// stock data (written before there was a second wallet) needs no migration and nothing has to remember
// to tag the objects it mints.
//
// The asymmetry that drives most of the rules: Openfort is a Project G smart account and multichain, so
// it holds anything. MetaMask is an EOA on EVM only — a Solana token or a Bitcoin address simply cannot
// live there, and moving one across the divider is blocked rather than bridged (bridging is Phase 2).
import type { DesktopObj } from "@/types/objects"

import { chainFamily, chainWord, isProjectG } from "./chain"

export type Wallet = "openfort" | "eoa"

/** What the segmented control selects: one wallet on its own, or both side by side. */
export type View = Wallet | "split"

export type WalletSpec = {
  id: Wallet
  /** The segmented control's label. */
  label: string
  /** The pane label's provider line. */
  provider: string
  address: string
  /** The wallet's mark, wherever it's named — the balance widget, the split pane label, the Move window. */
  image: string
  /** EVM-only wallets refuse anything off an EVM chain. */
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

/** Left-to-right order — also the order the split view lays the panes out in. */
export const WALLET_ORDER: Wallet[] = ["openfort", "eoa"]

/** Which wallet an object lives in. Absent means Openfort (see the note up top). */
export const walletOf = (obj: { wallet?: Wallet }): Wallet => obj.wallet ?? "openfort"

export const walletLabel = (w: Wallet) => WALLETS[w].label

/** The wallets a view shows — one, or both in pane order. */
export const visibleWallets = (view: View): Wallet[] => (view === "split" ? WALLET_ORDER : [view])

/** Why this object can't move into that wallet, or null if it can. Only the EVM-only rule blocks a move:
 *  a wallet that holds everything (Openfort) never refuses anything coming the other way. */
export function moveBlockMessage(obj: DesktopObj, to: Wallet): string | null {
  if (!WALLETS[to].evmOnly) return null
  const label = WALLETS[to].label

  if (obj.class === "asset") {
    if (chainFamily(obj.chain) === "evm") return null
    return `${label} is an EVM wallet — ${obj.label} (${obj.chain ?? "Base"}) can't be held there. Bridge it to Base first.`
  }

  // a Project G contact is multichain and reachable from anywhere; a single-chain external address only
  // belongs in a wallet of its own family
  if (isProjectG(obj) || chainFamily(obj.chain) === "evm") return null
  return `${label} only holds EVM addresses — ${obj.label} is a ${chainWord(obj.chain)} address.`
}
