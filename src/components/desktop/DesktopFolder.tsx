"use client"

import Image from "next/image"

import { ICON_W } from "@/const/desktop-layout"
import { clearCoinHover, setCoinCursor, setCoinHover } from "@/stores/coin"

import { cn } from "@/lib/utils"

type Props = {
  id: string
  label: string
  count: number
  dropKey?: string
  target?: boolean
  over?: boolean
  selected?: boolean
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
  // events
  const onEnter = (e: React.PointerEvent) => {
    setCoinCursor(e.clientX, e.clientY)
    setCoinHover(id)
  }
  const onLeave = () => clearCoinHover(id)
  const onMove = (e: React.PointerEvent) => setCoinCursor(e.clientX, e.clientY)

  // events
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
