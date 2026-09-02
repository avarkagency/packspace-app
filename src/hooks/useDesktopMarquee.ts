"use client"

import { type RefObject, useState } from "react"

import { type Pos, boxOf } from "@/const/desktop-layout"
import type { DesktopObj, FolderSpec } from "@/types/objects"

import { type Wallet, walletOf } from "@/lib/wallets"

// Marquee select. Starts only on the desk itself (a press on an icon is a pick-up, not a sweep), draws
// the box, and re-derives the selection from whichever icons it crosses. The coins need nothing: they
// follow their slots whatever moves them.
//
// Boxes are taken once on press, in VIEWPORT coordinates — that's what the sweep is drawn in, and
// nothing on the desk moves while a marquee is being dragged.

type Marquee = { x0: number; y0: number; x1: number; y1: number }

type Args = {
  /** The desk surface. A press that didn't land on it exactly is a press on something else. */
  rootRef: RefObject<HTMLDivElement | null>
  positions: Record<string, Pos> | null
  items: DesktopObj[]
  folders: FolderSpec[]
  /** Pane-relative → viewport, for an object whose wallet we know. */
  toScreen: (wallet: Wallet, p: Pos) => Pos
}

export function useDesktopMarquee({ rootRef, positions, items, folders, toScreen }: Args) {
  /** The ids swept up by the marquee. Dragging any of them moves the whole set. */
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [marquee, setMarquee] = useState<Marquee | null>(null)

  const onDeskPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== rootRef.current || !positions) return
    const sx = e.clientX
    const sy = e.clientY
    // folders sweep up too — a selection is for organising, and folders are furniture worth moving
    const boxes = [
      ...items.map((o) => ({ id: o.id, p: positions[o.id] && toScreen(walletOf(o), positions[o.id]) })),
      ...folders.map((f) => ({ id: f.id, p: positions[f.id] && toScreen(f.wallet, positions[f.id]) }))
    ].filter((b): b is { id: string; p: Pos } => !!b.p)
    setSelectedIds(new Set())

    const onSweep = (ev: PointerEvent) => {
      const x0 = Math.min(sx, ev.clientX)
      const y0 = Math.min(sy, ev.clientY)
      const x1 = Math.max(sx, ev.clientX)
      const y1 = Math.max(sy, ev.clientY)
      setMarquee({ x0: sx, y0: sy, x1: ev.clientX, y1: ev.clientY })
      setSelectedIds(
        new Set(
          boxes
            .filter(({ id, p }) => {
              const b = boxOf(id)
              return p.x < x1 && p.x + b.w > x0 && p.y < y1 && p.y + b.h > y0
            })
            .map(({ id }) => id)
        )
      )
    }
    const onLift = () => {
      window.removeEventListener("pointermove", onSweep)
      window.removeEventListener("pointerup", onLift)
      setMarquee(null)
    }
    window.addEventListener("pointermove", onSweep)
    window.addEventListener("pointerup", onLift)
  }

  return { selectedIds, setSelectedIds, marquee, onDeskPointerDown }
}
