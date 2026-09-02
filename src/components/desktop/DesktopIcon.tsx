"use client"

import Image from "next/image"
import { memo, useEffect, useRef } from "react"

import { clearCoinHover, registerCoinSlot, setCoinCursor, setCoinHover } from "@/stores/coin"
import type { DesktopObj } from "@/types/objects"
import { Check, History, ShieldX, TriangleAlert } from "lucide-react"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"
import { chainImage, objectNameColor } from "@/components/canvas/ObjectVisual"

import { cn, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

// One desktop item: the 3D object above, a small label under it — nothing else. The object itself is
// drawn by the canvas overlay into the slot this registers; the DOM here only lays out, hit-tests and
// labels. The workspace places each icon absolutely, so dragging one anywhere is just new coordinates.
//
// The icon must never move on hover: a CSS transform would shift the slot without the canvas knowing,
// and the object would drift off it. The object's own spin/scale is the hover feedback. A press is
// different: the slot rects are re-measured every frame, so the subtle press-down scale carries the
// 3D object with it rather than leaving it behind.

/** The icon's fixed footprint — the workspace lays out and clamps with these. */
export const ICON_W = 104
export const ICON_SLOT = 48
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
  /** This icon's right-click menu is open — it wears the drop-hover treatment while it is. */
  selected?: boolean
  /** Freshly made by a split — both halves flare yellow, then it fades. */
  flash?: boolean
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
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export const DesktopIcon = memo(function DesktopIcon({
  obj,
  label,
  dropKey,
  dimmed = false,
  target = false,
  over = false,
  selected = false,
  flash = false,
  anyDragging = false,
  renaming = false,
  onRename,
  onRenameCancel,
  onPointerDown,
  onDoubleClick,
  onContextMenu
}: Props) {
  // refs
  const slotRef = useRef<HTMLDivElement>(null)

  // data — address-lifecycle flags, only ever set on a contact
  const person = obj.class === "person" ? obj : null
  const retired = !!person?.retired
  const compromised = !!person?.compromised
  const delta = obj.class === "asset" ? dayChange(obj.symbol) : undefined
  // the small line under the name: the holding's value for an asset; standing / lifecycle for a contact
  const sub: { text: string; color?: string } =
    obj.class === "asset"
      ? { text: usd(obj.usd, { cents: false }) }
      : compromised
        ? { text: "Compromised", color: "#ff8a6a" }
        : retired
          ? { text: "Retired", color: "#f7c86a" }
          : obj.trust === "unconfirmed"
            ? { text: obj.whitelisted === false ? "Not in contacts" : "Unconfirmed", color: "#f7c86a" }
            : { text: obj.address ? `${obj.address.slice(0, 6)}...` : obj.handle }

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
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ width: ICON_W, padding: ICON_PAD }}
      className={cn(
        "group relative flex cursor-grab touch-none flex-col items-center gap-8 rounded-lg trans-base select-none active:scale-97 active:cursor-grabbing",
        dimmed && "opacity-40",
        retired && "opacity-60 grayscale",
        compromised && "outline outline-2 outline-[#ef5a44]/70",
        target && "bg-white/10 outline-1 outline-dashed outline-white/40",
        (over || selected) && "bg-white/20 outline-1 outline-dashed outline-white"
      )}>
      {/* the split flare rides its own layer so only opacity animates — the icon itself never moves */}
      {flash && (
        <span aria-hidden className="split-flash pointer-events-none absolute inset-0 rounded-lg bg-action-split/20 outline-1 outline-action-split/50" />
      )}
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
        {/* class badge on the object's shoulder — the network mark for a holding; for a wallet, its
            standing (verified check, or the warning for a bare address not in contacts). z-[60] lifts
            it over the canvas (z-50), which is what "in front of the 3D object" means here; while
            something is being carried it ducks to z-[40] so the flying coin passes over it rather
            than under. */}
        <span className={cn("pointer-events-none absolute -right-px -bottom-px", anyDragging ? "z-[40]" : "z-[60]")}>
          {obj.class === "person" ? (
            compromised ? (
              <span className="grid size-14 place-items-center rounded-full border border-white bg-[#ef5a44]">
                <ShieldX className="size-9 text-white" strokeWidth={2.5} />
              </span>
            ) : retired ? (
              <span className="grid size-14 place-items-center rounded-full border border-white bg-[#f7c86a]">
                <History className="size-9 text-black" strokeWidth={2.5} />
              </span>
            ) : obj.trust === "unconfirmed" ? (
              <TriangleAlert className="size-14 text-black" fill="#f1b90c" strokeWidth={1.5} />
            ) : (
              <span className="grid size-12 place-items-center rounded-full border border-white bg-[#13e192]">
                <Check className="size-8 text-black" strokeWidth={3} />
              </span>
            )
          ) : obj.chain ? (
            <Image
              src={chainImage(obj.chain)}
              alt={obj.chain}
              width={12}
              height={12}
              unoptimized
              className="size-12 rounded-full object-cover ring-1 ring-white/40"
            />
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
          <p
            className="tnum w-full truncate text-center text-12 font-medium leading-120 tracking-tight trans-base"
            style={{ color: over ? "#ffffff" : objectNameColor(obj) }}>
            {over ? (obj.class === "person" ? "Drop" : "Combine") : label}
          </p>
        )}

        {/* the second line, worn as a small pill: the holding's dollar value for an asset (with its
            24h move as a tag inside), the address for a wallet — or the warning that the address was
            never saved. */}
        <span
          className={cn(
            "tnum flex max-w-full items-center gap-4 rounded-full bg-white/20 py-2 pl-6 text-10 leading-120 text-white/90",
            delta !== undefined ? "pr-2" : "pr-6"
          )}
          style={sub.color ? { color: sub.color } : undefined}>
          <span className="truncate">{sub.text}</span>
          {delta !== undefined && <BaseChangeTag pct={delta} />}
        </span>
      </div>
    </div>
  )
})
