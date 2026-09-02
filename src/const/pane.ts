import type { View, Wallet } from "@/lib/wallets"

export type Pane = { left: number; top: number; width: number; height: number }

export const SPLIT_MIN = 0.2
export const SPLIT_MAX = 0.8
export const DIVIDER_W = 16

export function paneFor(view: View, wallet: Wallet, ratio: number, vw: number, vh: number): Pane {
  if (view !== "split") return { left: 0, top: 0, width: vw, height: vh }
  const leftW = Math.round(vw * ratio)
  return wallet === "openfort" ? { left: 0, top: 0, width: leftW, height: vh } : { left: leftW, top: 0, width: vw - leftW, height: vh }
}

export function walletAtX(view: View, ratio: number, vw: number, x: number): Wallet {
  if (view !== "split") return view
  return x < vw * ratio ? "openfort" : "eoa"
}
