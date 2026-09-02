"use client"

import { type RefObject, useState } from "react"

import { type Pos, boxOf } from "@/const/desktop-layout"
import type { DesktopObj, FolderSpec } from "@/types/objects"

import { type Wallet, walletOf } from "@/lib/wallets"

type Marquee = { x0: number; y0: number; x1: number; y1: number }

type Args = {
  rootRef: RefObject<HTMLDivElement | null>
  positions: Record<string, Pos> | null
  items: DesktopObj[]
  folders: FolderSpec[]
  toScreen: (wallet: Wallet, p: Pos) => Pos
}

export function useDesktopMarquee({ rootRef, positions, items, folders, toScreen }: Args) {
  // state
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [marquee, setMarquee] = useState<Marquee | null>(null)

  // events
  const onDeskPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== rootRef.current || !positions) return
    const sx = e.clientX
    const sy = e.clientY
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
