"use client"

import { useEffect, useRef, useState } from "react"

import { coinView, registerCoinSlot } from "@/stores/coin"
import { useDrag } from "@/stores/drag"
import type { NavItem } from "@/types/objects"

import { navDropKey } from "@/lib/asset-ops"
import { cn } from "@/lib/utils"

import { NAV_ITEMS } from "@/data/apps"

const DROP_TILES = 2
const GROUP_DROP_TILES = 1
const TILE = 48

export function dropTileAt(x: number, y: number): NavItem | undefined {
  return NAV_ITEMS.slice(0, GROUP_DROP_TILES).find((item) => {
    const r = coinView.rects.get(item.id)
    return !!r && Math.abs(x - r.cx) <= TILE / 2 && Math.abs(y - r.cy) <= TILE / 2
  })
}

export function DesktopDock({ carriedAsset = false, onOpen }: { carriedAsset?: boolean; onOpen?: (id: string) => void }) {
  // drag
  const { obj: dragged, carriedIds, over } = useDrag()
  const draggedAsset = dragged?.class === "asset" ? dragged : null

  return (
    <nav className="glass fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-16 p-4">
      {NAV_ITEMS.map((item, i) => {
        const armed = (!!draggedAsset && i < DROP_TILES) || (carriedAsset && i < GROUP_DROP_TILES)
        return (
          <DockTile
            key={item.id}
            item={item}
            dropKey={draggedAsset && i < DROP_TILES ? navDropKey(item.id) : undefined}
            target={armed}
            over={armed && over === navDropKey(item.id)}
            dragging={!!dragged || !!carriedIds}
            onOpen={onOpen}
          />
        )
      })}
    </nav>
  )
}

type TileProps = {
  item: NavItem
  dropKey?: string
  target?: boolean
  over?: boolean
  dragging?: boolean
  onOpen?: (id: string) => void
}

function DockTile({ item, dropKey, target = false, over = false, dragging = false, onOpen }: TileProps) {
  // refs
  const slotRef = useRef<HTMLDivElement>(null)

  // state
  const [hovered, setHovered] = useState(false)

  // effects
  useEffect(() => {
    if (!slotRef.current) return
    return registerCoinSlot(item.id, slotRef.current)
  }, [item.id])

  return (
    <button
      type="button"
      aria-label={item.label}
      data-drop={dropKey}
      onClick={() => onOpen?.(item.id)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "relative grid size-48 place-items-center rounded-12 trans-base",
        hovered && !dragging && "bg-white/10",
        target && "bg-white/10 outline-1 outline-dashed outline-white/40",
        over && "bg-white/20 outline-1 outline-dashed outline-white"
      )}>
      <div ref={slotRef} className="size-32" />

      {hovered && !dragging && (
        <span className="panel-in pointer-events-none absolute bottom-full left-1/2 mb-12 -translate-x-1/2 rounded-md bg-surface px-8 py-4 text-12 font-medium leading-120 tracking-tight whitespace-nowrap text-white">
          {item.label}
          <span className="absolute top-full left-1/2 -mt-4 size-8 -translate-x-1/2 rotate-45 bg-surface" aria-hidden />
        </span>
      )}
    </button>
  )
}
