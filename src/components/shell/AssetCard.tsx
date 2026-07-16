"use client"

import { memo, useEffect, useRef } from "react"

import Image from "next/image"

import { assetDropKey } from "@/lib/asset-ops"
import { clearCoinHover, registerCoinSlot, setCoinCursor, setCoinHover } from "@/lib/coin-store"
import type { AssetObj, PackObj } from "@/lib/types"
import { cn, units, usd } from "@/lib/utils"

import { chainImage } from "../canvas/objectVisual"

type Props = {
  obj: AssetObj | PackObj
  /** Something unrelated is in hand — recede so the cells that *can* take it stand out. */
  dimmed: boolean
  /** The coin in hand could be poured into this one. */
  target: boolean
  /** ...and is currently over it. */
  over: boolean
  /** This object was just created by a split — announce it. */
  cloned: boolean
  onPointerDown: (obj: AssetObj | PackObj) => (e: React.PointerEvent) => void
  /** Report this cell so the grid's travelling hover marker can slide onto it. */
  onCellEnter: (cell: HTMLElement) => void
}

// The coin is the tile. No surface, no radius — just a hairline lattice — with the holding and its value
// under each one.
//
// The tile must never move on hover: a CSS transform would shift the coin's slot without the canvas
// knowing, and the coin would drift off it. The coin's own spin/scale is the hover feedback.
//
// Assets drag onto a contact's Send/Handoff zone, the split dock, or another cell holding the same token
// (which recombines them). A tap selects — which arms the rail and the dock rather than marking the cell,
// since the grid's travelling marker owns that treatment now. Hovering the object raises the readout
// carrying what the cell doesn't show — which is where a pack's detail lives, since packs neither drag
// nor select.

export const AssetCard = memo(function AssetCard({ obj, dimmed, target, over, cloned, onPointerDown, onCellEnter }: Props) {
  // refs
  const slotRef = useRef<HTMLDivElement>(null)

  // data
  const isAsset = obj.class === "asset"
  const sub = isAsset ? `${units(obj.balance)} ${obj.symbol}` : obj.packClass === "randomized" ? "Randomized pack" : "Product pack"

  // events — the cursor is seeded on enter so the hover readout can place itself before its first paint
  const onEnter = (e: React.PointerEvent) => {
    setCoinCursor(e.clientX, e.clientY)
    setCoinHover(obj.id)
  }
  const onLeave = () => clearCoinHover(obj.id)
  const onMove = (e: React.PointerEvent) => setCoinCursor(e.clientX, e.clientY)

  // effects
  useEffect(() => {
    if (!slotRef.current) return
    return registerCoinSlot(obj.id, slotRef.current)
  }, [obj.id])

  return (
    <div
      // only a valid merge target carries a drop key. That keeps a drop from landing anywhere it can't
      // resolve, and stops `over` churning — and re-rendering every subscriber — on each cell crossed.
      data-drop={target ? assetDropKey(obj.id) : undefined}
      onPointerDown={onPointerDown(obj)}
      onPointerEnter={(e) => onCellEnter(e.currentTarget)}
      className={cn(
        // pb-40 sits the readout 40px off the cell's foot, per the design
        "group relative flex aspect-[4/5] touch-none flex-col items-center justify-between p-16 pb-40 trans-base select-none",
        isAsset ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        // right/bottom only: neighbouring cells supply the other two, so the lattice never doubles up.
        // The filter bar and sidebar close the top and left edges.
        "border-r border-b border-border",
        dimmed && "opacity-40",
        cloned && "fui-clone",
        // a merge target marks itself: several are lit at once, so this can't be the grid's single
        // travelling marker. Corners, not an outline — the lattice already owns the edges.
        (target || over) && "fui-cell-live"
      )}
    >
      {(target || over) && <span className="fui-brackets-lines" />}
      {/* network badge. `unoptimized`: at 28px Next asks the optimizer for a w=32 variant, and its dev
          converter drops the connection on three of the four marks — only whichever one it has already
          cached survives. These are 200px local files shown at 28px; there's nothing to optimise. */}
      {obj.chain && (
        <span title={obj.chain} className="absolute top-10 left-10 size-28 overflow-hidden rounded-full border border-border">
          <Image src={chainImage(obj.chain)} alt={obj.chain} width={28} height={28} unoptimized className="size-full object-cover" />
        </span>
      )}

      {/* the coin's box — drawn by the canvas overlay, not here. Empty by design: it exists only to be
          measured, so nothing shows in the cell if WebGL is unavailable.
          w-full matters: the card centres its children, which shrinks them to their content — a
          percentage width would resolve against nothing and the slot would collapse to zero. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {/* sized as a fraction of the cell, not a fixed px box — with four locked columns a fixed coin
            outgrows its cell as the viewport narrows, and the grid collapses into overlapping discs.
            Hover lives here rather than on the cell: the object is the thing you're pointing at, and the
            cell is mostly the space around it. Dragging still starts anywhere in the cell — that wants
            the big target; a readout doesn't. */}
        <div ref={slotRef} onPointerEnter={onEnter} onPointerLeave={onLeave} onPointerMove={onMove} className="aspect-square w-3/5 shrink-0" />
      </div>

      {/* value leads, holding follows — the design reads the money first and the units as its footnote.
          The sub is the one place Inter appears: it's the counterweight to Victor Mono's chrome. */}
      <div className="w-full text-center">
        <p className="tnum truncate text-24 font-semibold leading-100 text-foreground">{usd(obj.usd, { cents: false })}</p>
        <p className="mt-8 truncate font-sans text-14 text-accent uppercase">{over ? "Combine" : sub}</p>
      </div>
    </div>
  )
})
