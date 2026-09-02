"use client"

import Image from "next/image"
import { memo, useMemo } from "react"

import type { AssetObj } from "@/types/objects"
import { Minimize2 } from "lucide-react"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"
import { ObjectArt } from "@/components/desktop/object/ObjectArt"
import { chainImage } from "@/components/desktop/object/ObjectVisual"

import { chainTag } from "@/lib/chain"
import { assetMarket } from "@/lib/market"
import { cn, units, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

// A holding shown at length instead of as an icon: the object's art up in the header beside its name,
// then a four-tile bento of the numbers the icon can only hint at. It's the same desktop object underneath —
// same id, same position record, same drag — so it moves, combines and inspects exactly as its icon does.
//
// Desktop only, by design: a folder tile has no room for this, so filing one drops it back to an icon
// (the workspace prunes the card set whenever an object leaves the desk).
//
// The header art is FLAT — the same DOM treatment a folder tile uses, not the 3D coin. A card is a solid
// glass panel rather than an icon's empty slot, so a real coin would have to be layered either in front of
// the card (blurred behind its own glass) or behind it (with every other object's coin sliding over the top
// as it's dragged past). The workspace keeps carded objects out of the 3D scene entirely.

/** The card's fixed footprint — the workspace lays out and clamps with these, exactly as it does ICON_W. */
export const CARD_W = 260
export const CARD_H = 140

/** The art's box in the header. */
const MARK = 28

const UP = "#13e192"
const DOWN = "#ef5a44"

type Props = {
  obj: AssetObj
  /** Present when this card can take a drop right now — i.e. it's a valid merge target. */
  dropKey?: string
  /** Something unrelated is in hand — recede so the objects that *can* take it stand out. */
  dimmed?: boolean
  /** The coin in hand could land here. */
  target?: boolean
  /** ...and is currently over it. */
  over?: boolean
  /** Its right-click menu is open, or the marquee swept it up. */
  selected?: boolean
  /** Freshly made by a split — flares yellow, then fades. */
  flash?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  /** Back to the icon — the same thing the right-click menu's "Show as icon" does. */
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
  // data — the same deterministic fixture the AI Inspector's price card draws, so the two agree
  const market = useMemo(() => assetMarket(obj), [obj])
  const delta = dayChange(obj.symbol)
  const tag = chainTag(obj)
  const nft = obj.kind === "nft"
  // the trend line takes the direction's colour: the move IS the reading, so it shouldn't need a legend
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
      {/* the split flare rides its own layer so only opacity animates — the card itself never moves */}
      {flash && (
        <span aria-hidden className="split-flash pointer-events-none absolute inset-0 rounded-16 bg-action-split/20 outline-1 outline-action-split/50" />
      )}

      <div className="flex shrink-0 items-center gap-4">
        {/* the object's art, flat — the same treatment a folder tile uses, not the 3D coin */}
        <span className="mr-2 grid shrink-0 place-items-center" style={{ width: MARK, height: MARK }}>
          <ObjectArt obj={obj} size={MARK} />
        </span>
        <p className="min-w-0 truncate text-14 leading-120 font-medium tracking-tight text-white">{obj.label}</p>
        {/* the network's own mark, the same one the icon wears on its shoulder — which chain, beside
            the chain FAMILY the pill names */}
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
          // the press must not start a drag of the card underneath it
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

        {/* a single NFT's "price" is just its value again, so it reads its network instead */}
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

/** One bento cell: its name up top, the reading sat on the floor of the tile. */
function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-4 bg-white/10 px-8 pt-8 py-6">
      <p className="truncate text-10 leading-100 font-medium tracking-wide text-white/50 uppercase">{label}</p>
      <div className="mt-2 flex min-h-0 w-full flex-1 items-end text-12">{children}</div>
    </div>
  )
}

/** The trend line — the Inspector's chart with the interaction stripped out; at this size a hover
 *  readout would be a target you can't hit. The gradient id is keyed by object so two cards on the desk
 *  don't both resolve to whichever one painted first. */
function Sparkline({ id, prices, color }: { id: string; prices: number[]; color: string }) {
  const W = 100
  const H = 24
  const PAD = 4 // vertical headroom, in viewBox units, so peaks never clip
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
