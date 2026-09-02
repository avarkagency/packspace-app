"use client"

import { useSyncExternalStore } from "react"

// Screen geometry shared between the DOM grid and the R3F coin overlay. The DOM stays the source of
// truth for layout, hit-testing and labels; the canvas only draws. Each card registers the box its coin
// should fill, and the frame loop reads those boxes back out.
//
// Lives outside React for the same reason as stores/drag: the frame loop reads this every tick and must
// never cause a render. Hover is the one thing React can opt into, via useCoinHover — the frame loop
// still reads `coinView.hoverId` straight off the object and subscribes to nothing.

/** A coin's screen box: centre + diameter, in viewport px (the ortho camera maps 1 unit = 1 px). */
export type CoinRect = { cx: number; cy: number; size: number }

const slots = new Map<string, HTMLElement>()
let viewport: HTMLElement | null = null

export const coinView = {
  rects: new Map<string, CoinRect>(),
  /** The box resting coins clip to, in px. */
  clip: { top: 0, right: 0, bottom: 0, left: 0 },
  hoverId: null as string | null,
  /** While the AI Inspector is open, the id of the coin flying into its art card, and the card element it
   *  flies to. The frame loop overrides that coin's target box with the card's, and the mesh eases to it. */
  focusId: null as string | null,
  focusSlot: null as HTMLElement | null,
  /** True when focus jumped straight from one coin to another (Inspector navigation): the incoming coin
   *  drops into place instead of flying, so it reads as the texture changing rather than coins swapping. */
  focusInstant: false,
  /** The focused coin's live spin angle, handed to the next coin on an instant swap so the spin is seamless. */
  focusSpin: 0,
  /** Viewport px, written imperatively by the pointer handlers. */
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

/** Opt-in reactive read of the hover, for the one component that has to render on it. Everything else —
 *  the frame loop above all — reads `coinView.hoverId` directly and never subscribes, so hovering still
 *  costs no renders anywhere it isn't wanted. */
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

/** Pull a coin off the desk and into the Inspector's art card `el`. Reactive so the canvas can lift its
 *  z above the takeover while a coin is in focus. */
export const setCoinFocus = (id: string, el: HTMLElement, instant = false) => {
  // drop straight in (no fly) when this is a navigation swap, or when the caller asks (a filed object has
  // no desk position to fly from, so it just appears in the card)
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

/** Reactive read of the focused coin id, for the canvas that has to raise its z-index over the Inspector. */
export function useCoinFocus() {
  return useSyncExternalStore(
    subscribeFocus,
    () => coinView.focusId,
    () => null
  )
}

/** Register the box a coin should fill. Returns a cleanup for the effect that called it. */
export function registerCoinSlot(id: string, el: HTMLElement) {
  slots.set(id, el)
  return () => {
    slots.delete(id)
    coinView.rects.delete(id)
  }
}

/** The desktop surface — resting coins clip to it. On the desktop this is the whole viewport, so in
 *  practice it only keeps the clip planes honest rather than ever visibly cutting anything. */
export function registerCoinViewport(el: HTMLElement) {
  viewport = el
  return () => {
    viewport = null
  }
}

/** Recompute every coin's screen box, once per frame, from inside the render loop.
 *
 *  Measured every frame rather than on a scroll/resize dirty flag. A flag defers the read to the frame
 *  after the event, and scroll events aren't guaranteed to land before that frame's rAF — so the labels
 *  scrolled and the coins arrived a frame late, which read as the coin sliding around on its own card.
 *  Reading ~a dozen rects costs one layout flush (they're batched, with no writes interleaved), which is
 *  far cheaper than that lag looked. */
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
