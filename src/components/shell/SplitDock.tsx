"use client"

import { useEffect, useRef } from "react"

import { isSplittable } from "@/lib/asset-ops"
import { registerCoinFloor } from "@/lib/coin-store"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj } from "@/lib/types"
import { cn } from "@/lib/utils"

import { ActionZone } from "./ActionZone"

// Split lives on the grid's own dock rather than in the contacts rail, because dividing an object needs
// no counterparty — it's a pure UX convenience that prepares portions for a separate Send or Handoff.
//
// It's parked off the bottom edge until there's something to act on, then slides up. Absolutely
// positioned on purpose: in-layout it would resize the grid as it appeared, moving every card — and
// every coin — mid-drag.
//
// Fungible objects split; a one-of-one has nothing to divide, so the dock refuses it on approach rather
// than accepting the drop and failing in a modal.

export const SPLIT_DROP_KEY = "split"

export function SplitDock({ asset, onSplit }: { asset: AssetObj | null; onSplit: () => void }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)

  // drag
  const { asset: dragging, over } = useDrag()

  // data
  const isOver = over === SPLIT_DROP_KEY
  const refuses = !!dragging && !isSplittable(dragging)
  const live = !!asset && isSplittable(asset)
  // revealed by a drag, but also by a selection — otherwise clicking a coin would leave Split with no
  // way to reach it
  const open = !!dragging || live

  // effects — the canvas draws above the shell, so resting coins clip against this or they'd render
  // straight over the dock as it slides up
  useEffect(() => {
    if (!ref.current) return
    return registerCoinFloor(ref.current)
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        // opaque, not glass: it floats over the last row of the grid, and a translucent bar would leave
        // the cards behind it legible straight through the dock
        "absolute inset-x-0 bottom-0 z-10 border-t border-border bg-background p-12",
        "transition-transform duration-300 ease-[var(--ease-out-quart)] will-change-transform",
        open ? "translate-y-0" : "translate-y-full"
      )}
    >
      <ActionZone
        dropKey={SPLIT_DROP_KEY}
        label="Split"
        tone="split"
        live={live}
        isOver={isOver}
        refuses={refuses}
        refusedLabel="Can't split"
        focusable={open}
        onClick={onSplit}
      />
    </div>
  )
}
