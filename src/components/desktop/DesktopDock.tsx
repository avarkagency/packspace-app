"use client"

import { useEffect, useRef, useState } from "react"

import { navDropKey } from "@/lib/asset-ops"
import { coinView, registerCoinSlot } from "@/lib/coin-store"
import { NAV_ITEMS } from "@/lib/data"
import { useDrag } from "@/lib/drag-store"
import type { NavItem } from "@/lib/types"
import { cn } from "@/lib/utils"

// The dock along the bottom — a glass shelf of app tiles. Like every desktop icon, the DOM here only
// lays out, hover-tests and labels: each tile registers the box its icon fills and the 3D scene draws
// the artwork into it as a flat plane. The first two tiles take asset drops (the app interaction is
// still to come — today the drop just lands and the icon steps back off the shelf); a scene-drawn icon
// means the flying coin and the tile live in the same visual world.

/** The shelf's footprint, exported so the desk can keep parked icons clear of it — an icon left under
 *  the shelf could never be picked back up through it. Width = 7 tiles of 48, 4px gaps, 4px side pads. */
export const DOCK_W = 368
export const DOCK_H = 56
export const DOCK_GAP = 8

/** How many tiles, from the left, take single-asset drops. */
const DROP_TILES = 2
/** A carried multi-selection is narrower: only Pack Builder takes a whole handful. */
const GROUP_DROP_TILES = 1

/** A tile's full hit box, from its slot's measured centre. */
const TILE = 48

/** The tile a group carry could drop on under (x, y), if any — group carries can't elementFromPoint
 *  through the icons they're carrying. Reads the slot boxes the tiles register with the coin store
 *  (measured every frame), so the hit-test is the rendered layout itself rather than a mirror of its
 *  numbers. */
export function dropTileAt(x: number, y: number): NavItem | undefined {
  return NAV_ITEMS.slice(0, GROUP_DROP_TILES).find((item) => {
    const r = coinView.rects.get(item.id)
    return !!r && Math.abs(x - r.cx) <= TILE / 2 && Math.abs(y - r.cy) <= TILE / 2
  })
}

export function DesktopDock({ carriedAsset = false }: { carriedAsset?: boolean }) {
  // drag — the leading tiles light up as targets while an asset is in hand, alone or in a carried set
  const { obj: dragged, carriedIds, over } = useDrag()
  const draggedAsset = dragged?.class === "asset" ? dragged : null

  return (
    <nav className="glass fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-16 p-4">
      {NAV_ITEMS.map((item, i) => {
        // a single asset can land on the first two tiles; a carried handful only on Pack Builder
        const armed = (!!draggedAsset && i < DROP_TILES) || (carriedAsset && i < GROUP_DROP_TILES)
        return (
          <DockTile
            key={item.id}
            item={item}
            dropKey={draggedAsset && i < DROP_TILES ? navDropKey(item.id) : undefined}
            target={armed}
            over={armed && over === navDropKey(item.id)}
            dragging={!!dragged || !!carriedIds}
          />
        )
      })}
    </nav>
  )
}

type TileProps = {
  item: NavItem
  /** Present while this tile can take the drop happening right now. */
  dropKey?: string
  /** The coin in hand could land here. */
  target?: boolean
  /** ...and is currently over it. */
  over?: boolean
  /** Some object is in hand — the tooltip stands down; the drag label speaks for the cursor. */
  dragging?: boolean
}

function DockTile({ item, dropKey, target = false, over = false, dragging = false }: TileProps) {
  // refs
  const slotRef = useRef<HTMLDivElement>(null)

  // state
  const [hovered, setHovered] = useState(false)

  // effects — the icon's box, drawn by the canvas overlay exactly like a coin's
  useEffect(() => {
    if (!slotRef.current) return
    return registerCoinSlot(item.id, slotRef.current)
  }, [item.id])

  return (
    <button
      type="button"
      aria-label={item.label}
      data-drop={dropKey}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "relative grid size-48 place-items-center rounded-12 trans-base",
        hovered && !dragging && "bg-white/10",
        target && "bg-white/10 outline-1 outline-dashed outline-white/40",
        over && "bg-white/20 outline-1 outline-dashed outline-white"
      )}>
      <div ref={slotRef} className="size-32" />

      {/* the label, worn as a tooltip above the shelf. One opaque surface — the caret shares the
          bubble's solid fill, so the two read as a single shape. */}
      {hovered && !dragging && (
        <span className="panel-in pointer-events-none absolute bottom-full left-1/2 mb-12 -translate-x-1/2 rounded-md bg-surface px-8 py-4 text-12 font-medium leading-120 tracking-tight whitespace-nowrap text-white">
          {item.label}
          <span className="absolute top-full left-1/2 -mt-4 size-8 -translate-x-1/2 rotate-45 bg-surface" aria-hidden />
        </span>
      )}
    </button>
  )
}
