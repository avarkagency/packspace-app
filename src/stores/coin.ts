"use client"

import { useSyncExternalStore } from "react"

export type CoinRect = { cx: number; cy: number; size: number }

const slots = new Map<string, HTMLElement>()
let viewport: HTMLElement | null = null

export const coinView = {
  rects: new Map<string, CoinRect>(),
  clip: { top: 0, right: 0, bottom: 0, left: 0 },
  hoverId: null as string | null,
  focusId: null as string | null,
  focusSlot: null as HTMLElement | null,
  focusInstant: false,
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

export const setCoinFocus = (id: string, el: HTMLElement, instant = false) => {
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

export function useCoinFocus() {
  return useSyncExternalStore(
    subscribeFocus,
    () => coinView.focusId,
    () => null
  )
}

export function registerCoinSlot(id: string, el: HTMLElement) {
  slots.set(id, el)
  return () => {
    slots.delete(id)
    coinView.rects.delete(id)
  }
}

export function registerCoinViewport(el: HTMLElement) {
  viewport = el
  return () => {
    viewport = null
  }
}

export function measureCoins() {
  for (const [id, el] of slots) {
    const r = el.getBoundingClientRect()
    coinView.rects.set(id, {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      size: Math.min(r.width, r.height)
    })
  }

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
