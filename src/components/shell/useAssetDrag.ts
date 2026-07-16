"use client"

import { useRef } from "react"

import { coinView, setCoinCursor, setCoinHover } from "@/lib/coin-store"
import { endDrag, setOver, startDrag } from "@/lib/drag-store"
import type { AssetObj, PackObj } from "@/lib/types"

import { DRAG_SCALE } from "../canvas/ObjectMesh"
import { GHOST_GAP, GHOST_HEIGHT } from "./DragGhost"

/** Used only before the coin's box has been measured. */
const GHOST_FALLBACK = 96

// Pointer-driven drag for asset tiles. Starts after a small threshold (so taps still register as
// clicks), moves the ghost imperatively, hit-tests `[data-drop]` zones, and resolves drop vs click on
// up. Only assets drag; packs always resolve to a click.
//
// The canvas overlay reads the same cursor to fly the coin, so the drop hit-testing below stays pure
// DOM — `elementFromPoint` sees the zones, never the (pointer-events-none) canvas.

export function useAssetDrag(
  ghostRef: React.RefObject<HTMLDivElement | null>,
  handlers: { onDrop: (asset: AssetObj, dropKey: string) => void; onClick: (obj: AssetObj | PackObj) => void }
) {
  const drag = useRef<{ obj: AssetObj | PackObj; sx: number; sy: number; started: boolean } | null>(null)

  const moveGhost = (x: number, y: number) => {
    const el = ghostRef.current
    if (el) {
      el.style.transform = `translate(${x}px, ${y}px)`
      // clear the lifted coin. Its diameter tracks the cell, so a fixed offset would sit on top of it at
      // some viewport widths — derive the gap from the coin's measured box instead.
      const rect = drag.current ? coinView.rects.get(drag.current.obj.id) : null
      const clearance = rect ? (rect.size / 2) * DRAG_SCALE + GHOST_GAP : GHOST_FALLBACK
      // the split dock sits at the foot of the viewport, so a drag down there would push the label off
      // the bottom — flip it above the coin once we're close to the edge
      const flip = y + clearance + GHOST_HEIGHT > window.innerHeight
      el.style.setProperty("--ghost-shift", `${flip ? -clearance - GHOST_HEIGHT : clearance}px`)
    }
    setCoinCursor(x, y)
  }
  const dropAt = (x: number, y: number): string | null =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-drop]")?.getAttribute("data-drop") ?? null

  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
      if (d.obj.class !== "asset") return // packs don't drag
      d.started = true
      // drop the hover: the coin has left its card, so a lean derived from that card's box would be
      // measured against a position the coin no longer occupies
      setCoinHover(null)
      startDrag(d.obj)
    }
    moveGhost(e.clientX, e.clientY)
    setOver(dropAt(e.clientX, e.clientY))
  }

  const onUp = (e: PointerEvent) => {
    const d = drag.current
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    drag.current = null
    if (d) {
      if (d.started) {
        const k = dropAt(e.clientX, e.clientY)
        if (k) handlers.onDrop(d.obj as AssetObj, k)
      } else {
        handlers.onClick(d.obj)
      }
    }
    endDrag()
  }

  const onPointerDown = (obj: AssetObj | PackObj) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { obj, sx: e.clientX, sy: e.clientY, started: false }
    moveGhost(e.clientX, e.clientY)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return { onPointerDown }
}
