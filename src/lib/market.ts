import { dayChange } from "./data"
import type { AssetObj } from "./types"

/** Deterministic mock market data for an asset — the app models no price history, so this is a fixture
 *  seeded off the symbol (stable across renders): a unit price, its 24h move, a sparkline, high/low, vol.
 *  Shared by the AI Inspector's price card and the desktop detail card, so both draw the same line for
 *  the same token rather than two unrelated inventions. */
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
  // the per-point price the chart draws and the hover tooltip reads, within the day's range
  const prices = series.map((v) => low + v * (high - low))
  const volB = rnd() * 9 + 0.6 // billions
  return { unit, change, prices, high, low, volB }
}
