"use client"

import { useSyncExternalStore } from "react"

// Where each coin should draw: every icon registers its box, the frame loop reads them back out. Outside
// React because that loop reads it every tick and must never cause a render.

/** Centre + diameter in viewport px (the ortho camera maps 1 unit = 1 px). */
export type CoinRect = { cx: number; cy: number; size: number }

const slots = new Map<string, HTMLElement>()
let viewport: HTMLElement | null = null

export const coinView = {
  rects: new Map<string, CoinRect>(),
  clip: { top: 0, right: 0, bottom: 0, left: 0 },
  hoverId: null as string | null,
  /** While the Inspector is open, the coin flying into its art card and the element it flies to — the
   *  frame loop overrides that coin's target box with the card's. */
  focusId: null as string | null,
  focusSlot: null as HTMLElement | null,
  /** Focus jumped coin-to-coin (Inspector navigation): the incoming one drops in rather than flying, so
   *  it reads as the texture changing rather than two coins swapping. */
  focusInstant: false,
  /** Handed to the next coin on an instant swap, so the spin is seamless across it. */
  focusSpin: 0,
  cursor: { x: 0, y: 0 }
}

const hoverListeners = new Set<() => void>()
const focusListeners = new Set<() => void>()

export const setCoinHover = (id: string | null) => {
  if (coinView.hoverId === id) return
  coinView.hoverId = id
  hoverListeners.forEach((l) => l())
}

export const clearCoinHover = (id: string) => {
  if (coinView.hoverId === id) setCoinHover(null)
}

function subscribeHover(onChange: () => void) {
  hoverListeners.add(onChange)
  return () => {
    hoverListeners.delete(onChange)
  }
}

/** Opt-in reactive read, for the one component that has to render on hover. Everything else reads
 *  `coinView.hoverId` directly, so hovering costs no renders anywhere it isn't wanted. */
export function useCoinHover() {
  return useSyncExternalStore(
    subscribeHover,
    () => coinView.hoverId,
    () => null
  )
}

export const setCoinCursor = (x: number, y: number) => {
  coinView.cursor.x = x
  coinView.cursor.y = y
}

/** Pull a coin into the Inspector's art card. Reactive, so the canvas can lift its z over the takeover. */
export const setCoinFocus = (id: string, el: HTMLElement, instant = false) => {
  // no fly on a navigation swap, or when the caller asks — a filed object has no desk position to fly from
  coinView.focusInstant = instant || (coinView.focusId !== null && coinView.focusId !== id)
  coinView.focusId = id
  coinView.focusSlot = el
  focusListeners.forEach((l) => l())
}

export const clearCoinFocus = () => {
  if (coinView.focusId === null) return
  coinView.focusId = null
  coinView.focusSlot = null
  coinView.focusInstant = false
  focusListeners.forEach((l) => l())
}

function subscribeFocus(onChange: () => void) {
  focusListeners.add(onChange)
  return () => {
    focusListeners.delete(onChange)
  }
}

/** For the canvas, which has to raise its z-index over the Inspector while a coin is in focus. */
export function useCoinFocus() {
  return useSyncExternalStore(
    subscribeFocus,
    () => coinView.focusId,
    () => null
  )
}

/** Returns a cleanup for the effect that called it. */
export function registerCoinSlot(id: string, el: HTMLElement) {
  slots.set(id, el)
  return () => {
    slots.delete(id)
    coinView.rects.delete(id)
  }
}

/** The surface resting coins clip to. The whole viewport here, so it only keeps the planes honest. */
export function registerCoinViewport(el: HTMLElement) {
  viewport = el
  return () => {
    viewport = null
  }
}

/** Measured every frame, not on a scroll/resize dirty flag: a flag defers the read to the frame AFTER
 *  the event, and the coins then arrive late — which reads as one sliding around on its own icon. A dozen
 *  batched rects cost one layout flush, far cheaper than that lag looked. */
export function measureCoins() {
  for (const [id, el] of slots) {
    const r = el.getBoundingClientRect()
    coinView.rects.set(id, {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      size: Math.min(r.width, r.height)
    })
  }

  // the focused coin targets the Inspector's art card instead of its desk slot — measured last so it wins
  if (coinView.focusId && coinView.focusSlot) {
    const r = coinView.focusSlot.getBoundingClientRect()
    coinView.rects.set(coinView.focusId, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: Math.min(r.width, r.height) })
  }

  if (!viewport) return
  const v = viewport.getBoundingClientRect()
  coinView.clip.top = v.top
  coinView.clip.left = v.left
  coinView.clip.right = v.right
  coinView.clip.bottom = v.bottom
}
