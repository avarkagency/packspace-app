"use client"

import Image from "next/image"
import { memo, useMemo } from "react"

import { CARD_H, CARD_W } from "@/const/desktop-layout"
import type { AssetObj } from "@/types/objects"
import { Minimize2 } from "lucide-react"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"
import { ObjectArt } from "@/components/desktop/object/ObjectArt"
import { chainImage } from "@/components/desktop/object/ObjectVisual"

import { chainTag } from "@/lib/chain"
import { assetMarket } from "@/lib/market"
import { cn, units, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

const MARK = 28
const UP = "#13e192"
const DOWN = "#ef5a44"

type Props = {
  obj: AssetObj
  dropKey?: string
  dimmed?: boolean
  target?: boolean
  over?: boolean
  selected?: boolean
  flash?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onCollapse?: () => void
}

export const DesktopDetailCard = memo(function DesktopDetailCard({
  obj,
  dropKey,
  dimmed = false,
  target = false,
  over = false,
  selected = false,
  flash = false,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
  onCollapse
}: Props) {
  // data
  const market = useMemo(() => assetMarket(obj), [obj])
  const delta = dayChange(obj.symbol)
  const tag = chainTag(obj)
  const nft = obj.kind === "nft"
  const trendColor = (delta ?? market.change) < 0 ? DOWN : UP

  return (
    <div
      data-drop={dropKey}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ width: CARD_W, height: CARD_H }}
      className={cn(
        "glass flex cursor-grab touch-none flex-col gap-4 rounded-12 p-6 trans-base select-none active:cursor-grabbing",
        dimmed && "opacity-40",
        target && "outline-1 outline-dashed outline-white/40",
        (over || selected) && "outline-1 outline-dashed outline-white"
      )}>
      {flash && (
        <span aria-hidden className="split-flash pointer-events-none absolute inset-0 rounded-16 bg-action-split/20 outline-1 outline-action-split/50" />
      )}

      <div className="flex shrink-0 items-center gap-4">
        <span className="mr-2 grid shrink-0 place-items-center" style={{ width: MARK, height: MARK }}>
          <ObjectArt obj={obj} size={MARK} />
        </span>
        <p className="min-w-0 truncate text-14 leading-120 font-medium tracking-tight text-white">{obj.label}</p>

        {obj.chain && (
          <Image
            src={chainImage(obj.chain)}
            alt={obj.chain}
            width={14}
            height={14}
            unoptimized
            className="size-14 shrink-0 ml-4 rounded-full object-cover ring-1 ring-white/40"
          />
        )}
        {tag && (
          <span
            className="ml-auto shrink-0 rounded-full px-6 py-2 text-10 leading-100 font-bold tracking-wide"
            style={{ background: `${tag.color}`, color: "#fff" }}>
            {tag.label}
          </span>
        )}
        <button
          type="button"
          aria-label="Show as icon"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCollapse}
          className={cn("grid size-20 shrink-0 place-items-center rounded-4 text-white/60 trans-base hover:bg-white/15 hover:text-white", !tag && "ml-auto")}>
          <Minimize2 className="size-12" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <Tile label={nft ? "Collection" : "Balance"}>
          <p className="tnum w-full truncate text-14 leading-120 font-medium text-white">{nft ? obj.symbol : `${units(obj.balance)} ${obj.symbol}`}</p>
        </Tile>

        <Tile label="7d trend">
          <Sparkline id={obj.id} prices={market.prices} color={trendColor} />
        </Tile>

        <Tile label="Value">
          <span className="flex w-full min-w-0 items-center gap-4">
            <span className="tnum truncate text-14 leading-120 font-medium text-white">{usd(obj.usd, { cents: false })}</span>
            {nft && delta !== undefined && <BaseChangeTag pct={delta} />}
          </span>
        </Tile>

        <Tile label={nft ? "Network" : "Price"}>
          {nft ? (
            <p className="w-full truncate text-14 leading-120 font-medium text-white">{obj.chain ?? "Base"}</p>
          ) : (
            <span className="flex w-full min-w-0 items-center gap-4">
              <span className="tnum truncate text-14 leading-120 font-medium text-white">{usd(market.unit)}</span>
              {delta !== undefined && <BaseChangeTag pct={delta} />}
            </span>
          )}
        </Tile>
      </div>
    </div>
  )
})

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-4 bg-white/10 px-8 pt-8 py-6">
      <p className="truncate text-10 leading-100 font-medium tracking-wide text-white/50 uppercase">{label}</p>
      <div className="mt-2 flex min-h-0 w-full flex-1 items-end text-12">{children}</div>
    </div>
  )
}

function Sparkline({ id, prices, color }: { id: string; prices: number[]; color: string }) {
  const W = 100
  const H = 24
  const PAD = 4
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const step = W / (prices.length - 1)
  const py = (p: number) => H - PAD - (hi > lo ? (p - lo) / (hi - lo) : 0.5) * (H - 2 * PAD)
  const line = prices.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${py(p).toFixed(2)}`).join(" ")
  const area = `${line} L ${W.toFixed(2)} ${H} L 0 ${H} Z`
  const gid = `spark-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
