"use client"

import Image from "next/image"
import { memo, useEffect, useRef } from "react"

import { User } from "lucide-react"

import { clearCoinHover, registerCoinSlot, setCoinCursor, setCoinHover } from "@/lib/coin-store"
import type { DesktopObj } from "@/lib/types"
import { cn, usd } from "@/lib/utils"

import { chainImage } from "../canvas/objectVisual"

// One desktop item: the 3D object above, a small label under it — nothing else. The object itself is
// drawn by the canvas overlay into the slot this registers; the DOM here only lays out, hit-tests and
// labels. The workspace places each icon absolutely, so dragging one anywhere is just new coordinates.
//
// The icon must never move on hover: a CSS transform would shift the slot without the canvas knowing,
// and the object would drift off it. The object's own spin/scale is the hover feedback.

/** The icon's fixed footprint — the workspace lays out and clamps with these. */
export const ICON_W = 96
export const ICON_SLOT = 60
export const ICON_PAD = 8

type Props = {
  obj: DesktopObj
  label: string
  /** Present when this icon can take a drop right now — wallets always, assets only as merge targets. */
  dropKey?: string
  /** Something unrelated is in hand — recede so the icons that *can* take it stand out. */
  dimmed?: boolean
  /** The coin in hand could land here. */
  target?: boolean
  /** ...and is currently over it. */
  over?: boolean
  /** Some object is in hand. The badges normally float above the canvas ("in front of the 3D object"),
   *  but while one flies they duck underneath it — a badge must never sit on top of the coin being
   *  carried across it. The carried icon's own badge is unaffected: its wrapper stacks above the
   *  canvas wholesale. */
  anyDragging?: boolean
  /** The label is being edited in place (wallet rename). */
  renaming?: boolean
  onRename?: (name: string) => void
  onRenameCancel?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export const DesktopIcon = memo(function DesktopIcon({
  obj,
  label,
  dropKey,
  dimmed = false,
  target = false,
  over = false,
  anyDragging = false,
  renaming = false,
  onRename,
  onRenameCancel,
  onPointerDown,
  onContextMenu
}: Props) {
  // refs
  const slotRef = useRef<HTMLDivElement>(null)

  // events — the cursor is seeded on enter so the hover readout can place itself before its first paint
  const onEnter = (e: React.PointerEvent) => {
    setCoinCursor(e.clientX, e.clientY)
    setCoinHover(obj.id)
  }
  const onLeave = () => clearCoinHover(obj.id)
  const onMove = (e: React.PointerEvent) => setCoinCursor(e.clientX, e.clientY)

  // events — rename commits on Enter/blur, abandons on Escape. The input never joins the drag machinery:
  // a pointerdown inside it is text selection, not a pick-up.
  const commit = (el: HTMLInputElement) => {
    const name = el.value.trim()
    if (name && name !== label) onRename?.(name)
    else onRenameCancel?.()
  }
  const onRenameKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(e.currentTarget)
    if (e.key === "Escape") onRenameCancel?.()
  }

  // effects
  useEffect(() => {
    if (!slotRef.current) return
    return registerCoinSlot(obj.id, slotRef.current)
  }, [obj.id])

  return (
    <div
      data-drop={dropKey}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      style={{ width: ICON_W, padding: ICON_PAD }}
      className={cn(
        "group relative flex cursor-grab touch-none flex-col items-center gap-8 rounded-lg trans-base select-none active:cursor-grabbing",
        dimmed && "opacity-40",
        target && "bg-accent/8 ring-1 ring-accent/30",
        over && "bg-accent/15 ring-1 ring-accent"
      )}>
      {/* the object's box — drawn by the canvas overlay, not here. Empty by design: it exists only to
          be measured, so nothing shows if WebGL is unavailable. Hover lives here rather than on the
          whole icon: the object is the thing you're pointing at. */}
      <div
        ref={slotRef}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerMove={onMove}
        style={{ width: ICON_SLOT, height: ICON_SLOT }}
        className="relative shrink-0">
        {/* class badge on the object's shoulder — the network mark for a holding, a person mark for a
            wallet. z-[60] lifts it over the canvas (z-50), which is what "in front of the 3D object"
            means here; while something is being carried it ducks to z-[40] so the flying coin passes
            over it rather than under. */}
        <span
          className={cn(
            "pointer-events-none absolute -right-4 -bottom-4 grid size-22 place-items-center rounded-full border border-border bg-surface",
            anyDragging ? "z-[40]" : "z-[60]"
          )}>
          {obj.class === "person" ? (
            <User className="size-12 text-muted-foreground" strokeWidth={2} />
          ) : obj.chain ? (
            <Image src={chainImage(obj.chain)} alt={obj.chain} width={16} height={16} unoptimized className="size-16 rounded-full object-cover" />
          ) : null}
        </span>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        {renaming ? (
          <input
            defaultValue={label}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={onRenameKey}
            onBlur={(e) => commit(e.currentTarget)}
            className="w-full rounded-sm border border-accent bg-surface px-4 py-2 text-center text-12 text-foreground outline-none"
            aria-label="Rename wallet"
          />
        ) : (
          <p className={cn("tnum w-full truncate text-center text-12 font-medium leading-120 trans-base", over ? "text-accent" : "text-white")}>
            {over ? (obj.class === "person" ? "Drop" : "Combine") : label}
          </p>
        )}

        {/* the holding's dollar value, worn as a small pill under the label. Wallets have no value to
            wear — their line is their name. */}
        {obj.class === "asset" && <span className="tnum rounded-full bg-white/12 px-8 py-2 text-10 leading-120 text-white/75">{usd(obj.usd)}</span>}
      </div>
    </div>
  )
})
