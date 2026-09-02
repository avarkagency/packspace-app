import type { Pane } from "@/const/pane"

import type { Wallet } from "@/lib/wallets"

export const detailCardIds = new Set<string>()

export const objectWallet = new Map<string, Wallet>()
export const panesMirror: Record<Wallet, Pane> = {
  openfort: { left: 0, top: 0, width: 0, height: 0 },
  eoa: { left: 0, top: 0, width: 0, height: 0 }
}

export const walletOfId = (id?: string): Wallet => (id ? (objectWallet.get(id) ?? "openfort") : "openfort")

export function setDetailCards(ids: Iterable<string>) {
  detailCardIds.clear()
  for (const id of ids) detailCardIds.add(id)
}

export function setObjectWallets(entries: Iterable<[string, Wallet]>) {
  objectWallet.clear()
  for (const [id, wallet] of entries) objectWallet.set(id, wallet)
}

export function setPanes(panes: Record<Wallet, Pane>) {
  Object.assign(panesMirror.openfort, panes.openfort)
  Object.assign(panesMirror.eoa, panes.eoa)
}
