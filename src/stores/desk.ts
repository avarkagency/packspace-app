// The desk's module mirrors: what the layout maths needs to know about React state, kept outside React.
//
// `clampPos` and the collision helpers in `const/desktop-layout.ts` run on the drag's hot path and are
// plain module functions, so threading a footprint lookup and a pane rect through all twenty-odd call
// sites would mean rewriting every one of them. They read these instead — the same trick
// `chrome-keepout.ts` uses for the widget bento's box.
//
// Every write goes through the setters below, called from ONE layout effect in `Desktop.tsx` so the
// mirrors land before the browser paints and long before any pointer handler could consult them.
import type { Pane } from "@/const/pane"

import type { Wallet } from "@/lib/wallets"

/** The holdings currently shown as detail cards rather than icons — they have a much wider footprint. */
export const detailCardIds = new Set<string>()

/** Which wallet each object belongs to, and the pane each wallet currently occupies. */
export const objectWallet = new Map<string, Wallet>()
export const panesMirror: Record<Wallet, Pane> = {
  openfort: { left: 0, top: 0, width: 0, height: 0 },
  eoa: { left: 0, top: 0, width: 0, height: 0 }
}

/** An object's wallet. Unknown ids read as Openfort — which covers an object being placed in the same
 *  tick it's created, before the mirror catches up; those call sites pass their wallet explicitly. */
export const walletOfId = (id?: string): Wallet => (id ? (objectWallet.get(id) ?? "openfort") : "openfort")

export function setDetailCards(ids: Iterable<string>) {
  detailCardIds.clear()
  for (const id of ids) detailCardIds.add(id)
}

export function setObjectWallets(entries: Iterable<[string, Wallet]>) {
  objectWallet.clear()
  for (const [id, wallet] of entries) objectWallet.set(id, wallet)
}

/** Assigned INTO the existing rects rather than replacing them, so the identity of `panesMirror.openfort`
 *  never changes under a caller that happens to be holding it. */
export function setPanes(panes: Record<Wallet, Pane>) {
  Object.assign(panesMirror.openfort, panes.openfort)
  Object.assign(panesMirror.eoa, panes.eoa)
}
