import type { DesktopObj } from "@/types/objects"
import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our font sizes are raw pixel names (text-14). tailwind-merge's stock config only recognises t-shirt
// sizes there, so it reads `text-14` as a *colour* — and then drops it as a conflict the moment a real
// colour follows, as in cn("text-14", "text-foreground"). Silent, and only in cn(): plain className
// strings never pass through the merge, which is what made it look font-specific. Teach it the scale.
const FONT_SIZES = ["10", "11", "12", "13", "14", "16", "18", "20", "24", "28", "32", "36", "40", "48", "56", "64"]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: FONT_SIZES }] } }
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function usd(amount: number, opts?: { cents?: boolean }) {
  const showCents = opts?.cents ?? amount < 1000
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  })
}

export function compact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

/** Four decimals: enough for the smallest holdings, and no floating-point dust. */
export function round4(n: number) {
  return Math.round(n * 1e4) / 1e4
}

export function units(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 })
}

/** The drag label shows the same string, so an object reads identically at rest and in hand. */
export function desktopLabel(obj: DesktopObj) {
  return obj.class === "asset" ? `${units(obj.balance)} ${obj.symbol}` : obj.label
}

/** 0x1234…abcd — truth always available, shortened for display (spec DEV5). */
export function shortAddr(addr: string, lead = 6, tail = 4) {
  if (addr.length <= lead + tail) return addr
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`
}

/** Seeded, so a receipt's hash is stable across renders. */
export function fakeHash(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hex = "0123456789abcdef"
  let out = "0x"
  let x = h
  for (let i = 0; i < 40; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    out += hex[x & 0xf]
  }
  return out
}
