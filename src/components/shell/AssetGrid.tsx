"use client"

import { useCallback, useEffect, useRef } from "react"

import { SearchX } from "lucide-react"

import { assetDropKey, canCombine, isSameToken } from "@/lib/asset-ops"
import { registerCoinViewport } from "@/lib/coin-store"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj, PackObj } from "@/lib/types"

import { AssetCard } from "./AssetCard"

// Fixed 4-column grid, cells butted together into a bordered lattice. It also owns its scroll container,
// because the coin overlay clips to that box — coins must not bleed over the filter bar or the split
// dock.
//
// Subscribes to the drag once here and hands each cell its derived state, rather than letting every
// memo'd card subscribe and re-render on each store change.

const COLS = 4

export function AssetGrid({
  items,
  clonedId,
  onPointerDown
}: {
  items: (AssetObj | PackObj)[]
  /** The object a split just produced, if one is still announcing itself. */
  clonedId: string | null
  onPointerDown: (obj: AssetObj | PackObj) => (e: React.PointerEvent) => void
}) {
  // refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)

  // drag
  const { asset: dragging, over } = useDrag()

  // events — the hover marker is a single element that travels between cells rather than a treatment
  // each cell paints for itself; sliding is the whole point, and a cell can't slide to its neighbour.
  // Every cell is identical in size, so only its position ever animates.
  const moveMarker = useCallback(
    (cell: HTMLElement) => {
      const el = markerRef.current
      // a drag has its own language — the field dims and targets light up. A marker chasing the cursor
      // through that is just noise on top of it.
      if (!el || dragging) return

      // the cell's *content* box, not its border box. Cells paint after the marker (they come later in
      // the DOM), so their solid border-r/border-b sit right on top of its right and bottom bracket arms
      // and slice them off. clientWidth/clientHeight exclude those borders, landing the brackets just
      // inside the lattice instead of underneath it.
      const place = () => {
        el.style.width = `${cell.clientWidth}px`
        el.style.height = `${cell.clientHeight}px`
        el.style.transform = `translate(${cell.offsetLeft}px, ${cell.offsetTop}px)`
      }

      // arriving from hidden, land in place rather than flying across the grid from wherever it left off
      if (el.style.opacity !== "1") {
        el.style.transitionProperty = "none"
        place()
        void el.offsetWidth // flush, so the restored transition doesn't pick up the jump
        el.style.transitionProperty = ""
      }

      place()
      el.style.opacity = "1"
    },
    [dragging]
  )

  const hideMarker = useCallback(() => {
    if (markerRef.current) markerRef.current.style.opacity = "0"
  }, [])

  // effects — no scroll/resize listeners: the canvas re-measures every frame from inside its own render
  // loop, which is the only way the coins stay locked to their cells while scrolling.
  useEffect(() => {
    if (!scrollRef.current) return
    return registerCoinViewport(scrollRef.current)
  }, [])

  useEffect(() => {
    if (dragging) hideMarker()
  }, [dragging, hideMarker])

  return (
    // overscroll-none kills the macOS rubber-band: the overlay coins are positioned from measured rects,
    // so a bounce the compositor drives would slide the whole grid out from under them.
    //
    // overflow-x-hidden is load-bearing, not tidiness: setting only overflow-y computes overflow-x to
    // `auto`, so a single stray pixel raises a horizontal scrollbar. The marker is placed from rounded
    // offsets, and whenever the four columns don't divide evenly it lands ~1px past the grid's edge.
    // Nothing here is ever meant to scroll sideways.
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none">
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-10 text-muted-foreground">
          <SearchX className="size-32 opacity-40" />
          <p className="text-12 tracking-[0.08em] uppercase">No assets match those filters</p>
        </div>
      ) : (
        <div className="relative grid grid-cols-4" onPointerLeave={hideMarker}>
          {/* the travelling hover marker. First in the DOM so the cells' own labels paint over its fill;
              its brackets sit in the corners, where there's nothing to cover. */}
          <div
            ref={markerRef}
            aria-hidden
            className="fui-cell-live pointer-events-none absolute top-0 left-0 opacity-0 transition-[transform,opacity] duration-200 ease-[var(--ease-out-quart)]"
          >
            <span className="fui-brackets-lines" />
          </div>

          {items.map((obj) => (
            <AssetCard
              key={obj.id}
              obj={obj}
              // the coin in hand stays lit along with anything it could merge into; everything else recedes
              dimmed={!!dragging && !isSameToken(dragging, obj)}
              target={!!dragging && canCombine(dragging, obj)}
              over={!!dragging && over === assetDropKey(obj.id)}
              cloned={obj.id === clonedId}
              onPointerDown={onPointerDown}
              onCellEnter={moveMarker}
            />
          ))}
          {/* pad the last row out so the lattice stays a continuous field rather than stopping mid-row */}
          {Array.from({ length: (COLS - (items.length % COLS)) % COLS }, (_, i) => (
            <div key={`fill-${i}`} className="aspect-[4/5] border-r border-b border-border" aria-hidden />
          ))}
        </div>
      )}
    </div>
  )
}
