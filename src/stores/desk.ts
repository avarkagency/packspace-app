// React state mirrored outside React, for the plain module functions in `const/desktop-layout.ts` that
// run on the drag's hot path. Written only by the layout effect in `Desktop.tsx`, so they land before
// paint and long before any pointer handler could consult them.
import type { Pane } from "@/const/pane"

import type { Wallet } from "@/lib/wallets"

/** Shown as detail cards rather than icons — a much wider footprint. */
export const detailCardIds = new Set<string>()

export const objectWallet = new Map<string, Wallet>()
export const panesMirror: Record<Wallet, Pane> = {
  openfort: { left: 0, top: 0, width: 0, height: 0 },
  eoa: { left: 0, top: 0, width: 0, height: 0 }
}

/** Unknown ids read as Openfort — that covers an object placed in the same tick it's created, before
 *  the mirror catches up; those call sites pass their wallet explicitly. */
export const walletOfId = (id?: string): Wallet => (id ? (objectWallet.get(id) ?? "openfort") : "openfort")

export function setDetailCards(ids: Iterable<string>) {
  detailCardIds.clear()
  for (const id of ids) detailCardIds.add(id)
}

export function setObjectWallets(entries: Iterable<[string, Wallet]>) {
  objectWallet.clear()
  for (const [id, wallet] of entries) objectWallet.set(id, wallet)
}

/** Assigned INTO the existing rects, so `panesMirror.openfort` never changes identity under a holder. */
export function setPanes(panes: Record<Wallet, Pane>) {
  Object.assign(panesMirror.openfort, panes.openfort)
  Object.assign(panesMirror.eoa, panes.eoa)
}
