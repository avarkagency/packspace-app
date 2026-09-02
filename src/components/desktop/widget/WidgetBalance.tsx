"use client"

import Image from "next/image"
import { useLayoutEffect, useRef, useState } from "react"

import type { AssetObj } from "@/types/objects"
import { createPortal } from "react-dom"

import { cn, shortAddr, usd } from "@/lib/utils"
import { WALLETS, type Wallet } from "@/lib/wallets"

// The balance widget, for whichever wallet's desk it's sitting on — its name, its address, and the
// holdings that wallet actually has. Two-column form carries the legend list on the right; one-column
// form drops the list and instead reads a slice out on hover over the distribution bar — the same
// numbers, folded into the bar to fit the narrower footprint.
//
// The hover tooltip is PORTALED to <body>, not nested in the widget. The widget is a `.glass` surface —
// its own backdrop-filter makes it a backdrop root, and Chrome silently drops a backdrop-filter nested
// inside one. Out at the body it frosts whatever sits behind it on screen (here, the balance total).

type Slice = { label: string; color: string; usd: number; pct: number }

/** Designed chart colours for the tokens that have one. Display colours from the design — SOL charts
 *  black (its mark's colour), which is why this isn't the token tint used on the coins. Anything not
 *  listed charts in its own tint instead. */
const LEGEND_COLOR: Record<string, string> = {
  ETH: "#627eeb",
  BNB: "#f1b90c",
  SOL: "#000000",
  USDC: "#2775ca",
  USDT: "#1ba27a"
}

const OTHER_COLOR = "rgba(255,255,255,0.5)"

/** How many named slices the chart carries before the tail pools into Other. */
const MAX_SLICES = 5

/** The portfolio grouped for the card: a slice per holding, biggest first, with the tail pooled as
 *  Other. Derived from the wallet's own holdings rather than a fixed symbol list — the widget belongs to
 *  whichever desk it's sitting on, and a fixed list would chart a wallet holding none of those tokens as
 *  one undifferentiated grey bar. */
function slices(assets: AssetObj[]) {
  const total = assets.reduce((t, a) => t + a.usd, 0)
  if (total <= 0) return { total: 0, rows: [] }

  const bySymbol = new Map<string, { usd: number; color: string }>()
  for (const a of assets) {
    const cur = bySymbol.get(a.symbol)
    bySymbol.set(a.symbol, { usd: (cur?.usd ?? 0) + a.usd, color: LEGEND_COLOR[a.symbol] ?? cur?.color ?? a.color })
  }

  const ranked = [...bySymbol].map(([label, s]) => ({ label, ...s })).sort((a, b) => b.usd - a.usd)
  const named = ranked.slice(0, MAX_SLICES)
  const tail = ranked.slice(MAX_SLICES).reduce((t, s) => t + s.usd, 0)
  const all = [...named, { label: "Other", color: OTHER_COLOR, usd: tail }].filter((s) => s.usd > 0)
  return { total, rows: all.map((s) => ({ ...s, pct: Math.round((s.usd / total) * 100) })) }
}

export function WidgetBalance({ assets, span, wallet }: { assets: AssetObj[]; span: 1 | 2; wallet: Wallet }) {
  // state
  const [hovered, setHovered] = useState<{ row: Slice; rect: DOMRect } | null>(null)

  // data
  const { total, rows } = slices(assets)

  // data
  const tip = span === 1 ? hovered : null

  return (
    <div className={cn("glass flex h-full rounded-16 p-16", span === 2 && "gap-32")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-8">
          <Image src={WALLETS[wallet].image} alt="" width={24} height={24} unoptimized className="size-24 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-12 leading-120 tracking-tight text-white mb-2">{WALLETS[wallet].label} balance</p>
            <p className="tnum truncate text-10 leading-120 text-white/70">{shortAddr(WALLETS[wallet].address)}</p>
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
