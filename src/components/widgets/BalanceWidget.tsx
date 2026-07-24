"use client"

import Image from "next/image"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { WALLET } from "@/lib/data"
import type { AssetObj } from "@/lib/types"
import { cn, shortAddr, usd } from "@/lib/utils"

// The Openfort balance widget. Two-column form carries the legend list on the right; one-column form
// drops the list and instead reads a slice out on hover over the distribution bar — the same numbers,
// folded into the bar to fit the narrower footprint.
//
// The hover tooltip is PORTALED to <body>, not nested in the widget. The widget is a `.glass` surface —
// its own backdrop-filter makes it a backdrop root, and Chrome silently drops a backdrop-filter nested
// inside one. Out at the body it frosts whatever sits behind it on screen (here, the balance total).

type Slice = { label: string; color: string; usd: number; pct: number }

/** Legend + distribution colours, by symbol. Display colours from the design — SOL charts black (its
 *  mark's colour), which is why this isn't the token tint used on the coins. */
const LEGEND: { symbol: string; color: string }[] = [
  { symbol: "ETH", color: "#627eeb" },
  { symbol: "BNB", color: "#f1b90c" },
  { symbol: "SOL", color: "#000000" },
  { symbol: "USDC", color: "#2775ca" },
  { symbol: "USDT", color: "#1ba27a" }
]

const OTHER_COLOR = "rgba(255,255,255,0.5)"

/** The portfolio grouped for the card: one slice per legend symbol, everything else pooled as Other. */
function slices(assets: AssetObj[]) {
  const total = assets.reduce((t, a) => t + a.usd, 0)
  const bySymbol = new Map<string, number>()
  for (const a of assets) bySymbol.set(a.symbol, (bySymbol.get(a.symbol) ?? 0) + a.usd)

  const known = LEGEND.map(({ symbol, color }) => ({ label: symbol, color, usd: bySymbol.get(symbol) ?? 0 }))
  const other = total - known.reduce((t, s) => t + s.usd, 0)
  const all = [...known, { label: "Other", color: OTHER_COLOR, usd: other }].filter((s) => s.usd > 0)
  return { total, rows: all.map((s) => ({ ...s, pct: Math.round((s.usd / total) * 100) })) }
}

export function BalanceWidget({ assets, span }: { assets: AssetObj[]; span: 1 | 2 }) {
  // state — the hovered slice and its on-screen box, for the one-column bar tooltip
  const [hovered, setHovered] = useState<{ row: Slice; rect: DOMRect } | null>(null)

  // data
  const { total, rows } = slices(assets)

  // data — the tooltip shows only in the one-column form
  const tip = span === 1 ? hovered : null

  return (
    <div className={cn("glass flex h-full rounded-16 p-16", span === 2 && "gap-32")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-8">
          <Image src="/images/openfort.png" alt="Openfort" width={24} height={24} unoptimized className="size-24 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-12 leading-120 tracking-tight text-white mb-2">Openfort balance</p>
            <p className="tnum truncate text-10 leading-120 text-white/70">{shortAddr(WALLET.address)}</p>
          </div>
        </div>

        <p className="tnum mt-auto text-24 font-light leading-120 tracking-tight text-white">{usd(total, { cents: false })}</p>

        {/* the distribution bar — one sliver per slice, hairline gaps between. In the one-column form the
            slices are hoverable and a tooltip reads out the slice the legend would otherwise name. */}
        <div className="mt-8 mb-4">
          <div className="flex h-4 w-full gap-px overflow-hidden rounded-full">
            {rows.map((r) => (
              <span
                key={r.label}
                style={{ width: `${r.pct}%`, background: r.color }}
                onPointerEnter={span === 1 ? (e) => setHovered({ row: r, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
                onPointerLeave={span === 1 ? () => setHovered(null) : undefined}
              />
            ))}
          </div>
        </div>
        {tip && <BarTip row={tip.row} rect={tip.rect} />}
      </div>

      {span === 2 && (
        <dl className="flex w-140 shrink-0 flex-col gap-6">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-8">
              <dt className="flex items-center gap-8 text-10 leading-120 text-white">
                <span className="size-4 shrink-0" style={{ background: r.color }} aria-hidden />
                {r.label}
              </dt>
              <dd className="tnum text-10 font-medium leading-120 text-white">{r.pct}%</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/** The bar's hover readout, portaled to <body> so its backdrop-filter runs (see the note up top) and
 *  frosts the balance total behind it. Measured after mount, then clamped so it never spills off screen —
 *  which also handles a one-column widget parked in the right column. */
function BarTip({ row, rect }: { row: Slice; rect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const cx = rect.left + rect.width / 2
    setPos({ left: Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8)), top: rect.top - h - 8 })
  }, [rect])

  return createPortal(
    <div
      ref={ref}
      className="panel pointer-events-none fixed z-[900] rounded-8 px-8 py-4 whitespace-nowrap"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}>
      <span className="tnum flex items-center gap-6 text-10 leading-120 text-white">
        <span className="size-6 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
        {row.label} · {row.pct}% · {usd(row.usd, { cents: false })}
      </span>
    </div>,
    document.body
  )
}
