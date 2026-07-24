"use client"

import Image from "next/image"

import { clearCoinHover, setCoinCursor, setCoinHover } from "@/lib/coin-store"
import { cn } from "@/lib/utils"

import { ICON_W } from "./DesktopIcon"

// A desk folder — Other Tokens holds the long tail of dust balances, and the desk menu can mint empty
// ones to organise into. Double-click to open its window; drag to move it; right-click to rename or
// delete it; drop assets or contacts onto it to file them (never another folder — folders go one level
// deep, which is enforced simply by a folder never carrying a drop key while one is being moved). It
// wears the same anatomy as every desktop icon (art, label, pill), but the art is a flat image rather
// than a scene-drawn coin — a folder is furniture, not currency.

type Props = {
  /** The folder's id — hovering it drives the same cursor-trailing readout the coins use, keyed here. */
  id: string
  label: string
  count: number
  /** Present while this folder can take the drop happening right now. */
  dropKey?: string
  /** The object in hand could be filed here. */
  target?: boolean
  /** ...and is currently over it. */
  over?: boolean
  /** Swept up by the marquee — wears the same dashed dress as any selected icon. */
  selected?: boolean
  /** The label is being edited in place — new folders arrive already renaming. */
  renaming?: boolean
  onRename?: (name: string) => void
  onRenameCancel?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function DesktopFolder({
  id,
  label,
  count,
  dropKey,
  target = false,
  over = false,
  selected = false,
  renaming = false,
  onRename,
  onRenameCancel,
  onPointerDown,
  onDoubleClick,
  onContextMenu
}: Props) {
  // events — the hover readout. The cursor is seeded on enter so the peek can place itself before its
  // first paint; the workspace gates it away while anything's in hand, so filing never fights the peek.
  const onEnter = (e: React.PointerEvent) => {
    setCoinCursor(e.clientX, e.clientY)
    setCoinHover(id)
  }
  const onLeave = () => clearCoinHover(id)
  const onMove = (e: React.PointerEvent) => setCoinCursor(e.clientX, e.clientY)

  // events — rename commits on Enter/blur, abandons on Escape. The input never joins the drag
  // machinery: a pointerdown inside it is text selection, not a pick-up.
  const commit = (el: HTMLInputElement) => {
    const name = el.value.trim()
    if (name && name !== label) onRename?.(name)
    else onRenameCancel?.()
  }
  const onRenameKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(e.currentTarget)
    if (e.key === "Escape") onRenameCancel?.()
  }

  return (
    <div
      data-drop={dropKey}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ width: ICON_W, padding: 8 }}
      className={cn(
        "flex cursor-grab touch-none flex-col items-center gap-8 rounded-lg trans-base select-none active:scale-97 active:cursor-grabbing",
        target && "bg-white/10 outline-1 outline-dashed outline-white/40",
        (over || selected) && "bg-white/20 outline-1 outline-dashed outline-white"
      )}>
      <div className="grid h-48 shrink-0 place-items-center" onPointerEnter={onEnter} onPointerLeave={onLeave} onPointerMove={onMove}>
        {/* draggable={false}: the browser's native image drag would carry a ghost of the artwork
            instead of letting the pointer machinery move the icon. The art rests slightly small and
            grows on hover — the flat cousin of the scale-up the scene gives a hovered coin. */}
        <Image
          src="/images/folder.png"
          alt={`${label} folder`}
          width={63}
          height={49}
          unoptimized
          draggable={false}
          className="h-48 w-auto scale-95 trans-base hover:scale-100"
        />
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
            className="w-full rounded-sm border border-white/40 bg-surface px-4 py-2 text-center text-12 text-foreground outline-none"
            aria-label="Rename folder"
          />
        ) : (
          <p className="w-full truncate text-center text-12 font-medium leading-120 tracking-tight text-white">{over ? "Drop" : label}</p>
        )}
        <span className="tnum rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  )
}
