"use client"

import Image from "next/image"
import { useState } from "react"

import { Search } from "lucide-react"

import { WALLET } from "@/lib/data"
import type { AssetObj } from "@/lib/types"
import { cn, shortAddr, usd } from "@/lib/utils"

// The desktop's top chrome. No longer a solid OS bar: the wallpaper runs to the top edge and the
// chrome floats on it — identity and greeting on the left, the wallet/view toggles and the balance
// card on the right. The toggles are design-only for now (they hold their state, drive nothing).

/** Legend + distribution colours, by symbol. These are display colours from the design — SOL charts
 *  black (its mark's colour), which is why this isn't the token tint used on the coins. */
const LEGEND: { symbol: string; color: string }[] = [
  { symbol: "ETH", color: "#627eeb" },
  { symbol: "BNB", color: "#f1b90c" },
  { symbol: "SOL", color: "#000000" },
  { symbol: "USDC", color: "#2775ca" },
  { symbol: "USDT", color: "#1ba27a" }
]

const OTHER_COLOR = "rgba(255,255,255,0.5)"

/** The top-right chrome's keep-out box (search + toggles + balance card), anchored to the viewport's
 *  top-right corner. Exported for the desk's placement clamp — an icon parked under this chrome could
 *  never be picked back up through it. */
export const CHROME_KEEPOUT_W = 392
export const CHROME_KEEPOUT_H = 176

/** The view tabs — exactly one is ever active. "Show/Hide Chains" lives beside them but is its own
 *  creature: a stateful action whose label flips, never wearing the active pill. */
const VIEW_TABS = ["Openfort", "MetaMask", "Split View"]

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

export function DesktopBar({ assets }: { assets: AssetObj[] }) {
  // state — display-only until the features land
  const [active, setActive] = useState("Openfort")
  const [chainsShown, setChainsShown] = useState(false)

  // data
  const { total, rows } = slices(assets)

  return (
    <>
      {/* identity + greeting — deliberately UNDER everything on the desk. No z-index on purpose: the
          bar renders first, so the icon layer, the canvas (z-50) and the badges all paint over it, and
          an object dragged across the corner flies over the words like paper over a desk blotter. */}
      <div className="pointer-events-none fixed top-56 left-32 flex flex-col">
        <div className="flex items-center gap-6">
          <span className="grid size-18 place-items-center rounded-4 border border-white/50 bg-white/20 text-12 font-bold text-white">P</span>
          <span className="text-12 tracking-tight text-white">PackSpace</span>
        </div>
        <h1 className="mt-8 text-28 font-light leading-120 tracking-tight text-white">Welcome back</h1>
        <p className="mt-8 text-16 leading-120 tracking-tight text-white/70">
          Drag an asset onto a contact to <span className="text-white">Send</span> or <span className="text-white">Handoff</span>.
        </p>
      </div>

      {/* search + view toggles */}
      <div className="fixed top-8 right-8 z-[100] flex items-center gap-8">
        <button type="button" aria-label="Search" className="glass grid size-32 place-items-center rounded-full trans-base hover:bg-white/20">
          <Search className="size-12 text-white" strokeWidth={2.5} />
        </button>
        <div className="glass h-32 flex items-center rounded-full p-4">
          {VIEW_TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActive(name)}
              className={cn(
                "rounded-full px-12 h-24 text-12 leading-120 tracking-tight text-white trans-base",
                active === name ? "bg-white/20" : "hover:bg-white/10"
              )}>
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setChainsShown((v) => !v)}
            className="rounded-full w-94 py-4 text-12 leading-120 tracking-tight text-white trans-base hover:bg-white/10">
            {chainsShown ? "Hide Chains" : "Show Chains"}
          </button>
        </div>
      </div>

      {/* balance card */}
      <div className="glass fixed top-48 right-8 z-100 flex w-332 gap-32 rounded-16 p-16">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-8">
            <Image src="/images/openfort.png" alt="Openfort" width={24} height={24} unoptimized className="size-24 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-12 leading-120 tracking-tight text-white mb-2">Openfort balance</p>
              <p className="tnum truncate text-10 leading-120 text-white/70">{shortAddr(WALLET.address)}</p>
            </div>
          </div>

          <p className="tnum mt-auto text-24 font-light leading-120 tracking-tight text-white">{usd(total, { cents: false })}</p>

          {/* the distribution bar — one sliver per slice, hairline gaps between */}
          <div className="mt-8 mb-4 flex h-4 w-full gap-px overflow-hidden rounded-full">
            {rows.map((r) => (
              <span key={r.label} style={{ width: `${r.pct}%`, background: r.color }} />
            ))}
          </div>
        </div>

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
      </div>
    </>
  )
}
