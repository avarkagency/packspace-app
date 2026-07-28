// The desk surface a wallet's objects live on.
//
// Object positions are stored PANE-RELATIVE, not in viewport coordinates. In a single-wallet view the
// pane is the whole viewport, so a position is its screen position and nothing about the existing desk
// changes. In split view each wallet gets half, and the same stored position now reads as "70px in from
// my own pane's left edge" — which is what lets an arrangement survive the switch between views instead
// of being re-laid-out every time the divider moves.
//
// Because every position is clamped to its pane, an object at rest can never overflow into the other
// half. That's deliberate: it means the panes need no clipping, and the 3D coins — which are drawn by a
// single full-screen canvas that knows nothing about panes — stay correct for free. The only thing that
// ever crosses the divider is an object in hand, which should.
import type { View, Wallet } from "./wallets"

export type Pane = { left: number; top: number; width: number; height: number }

/** How far the divider may be dragged, as a fraction of the viewport. Neither pane collapses. */
export const SPLIT_MIN = 0.2
export const SPLIT_MAX = 0.8

/** The divider's grab strip. Wider than the 4px rule it draws, so it's a comfortable pointer target. */
export const DIVIDER_W = 16

export const fullPane = (): Pane => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight })

/** The box a wallet's objects occupy on screen. Outside split view every wallet owns the whole viewport
 *  (only one of them is being shown at a time, so they can't collide). */
export function paneFor(view: View, wallet: Wallet, ratio: number, vw: number, vh: number): Pane {
  if (view !== "split") return { left: 0, top: 0, width: vw, height: vh }
  const leftW = Math.round(vw * ratio)
  return wallet === "openfort"
    ? { left: 0, top: 0, width: leftW, height: vh }
    : { left: leftW, top: 0, width: vw - leftW, height: vh }
}

/** Which wallet's half of the screen this viewport x lands in. Meaningless outside split view, where
 *  the answer is always the one wallet on show. */
export function walletAtX(view: View, ratio: number, vw: number, x: number): Wallet {
  if (view !== "split") return view
  return x < vw * ratio ? "openfort" : "eoa"
}

/** Pane-relative → viewport. */
export const toViewport = (pane: Pane, x: number, y: number) => ({ x: pane.left + x, y: pane.top + y })

/** Viewport → pane-relative. */
export const toPane = (pane: Pane, x: number, y: number) => ({ x: x - pane.left, y: y - pane.top })
