import type { AssetObj } from "@/types/objects"

import { dayChange } from "@/data/assets"

export function assetMarket(a: AssetObj) {
  let s = 2166136261
  for (let i = 0; i < a.symbol.length; i++) s = ((s ^ a.symbol.charCodeAt(i)) * 16777619) >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }

  const unit = a.balance > 0 ? a.usd / a.balance : a.usd
  const change = dayChange(a.symbol) ?? rnd() * 5 - 2.5

  const N = 44
  const raw: number[] = []
  let v = 0
  for (let i = 0; i < N; i++) {
    v += change / 100 / N + (rnd() - 0.5) * 0.018
    raw.push(v)
  }
  const lo = Math.min(...raw)
  const hi = Math.max(...raw)
  const series = raw.map((p) => (hi > lo ? (p - lo) / (hi - lo) : 0.5))

  const spread = 0.04 + rnd() * 0.06
  const high = unit * (1 + spread)
  const low = unit * (1 - spread * 0.85)
  const prices = series.map((v) => low + v * (high - low))
  const volB = rnd() * 9 + 0.6 // billions
  return { unit, change, prices, high, low, volB }
}
