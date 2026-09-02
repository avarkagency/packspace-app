"use client"

import { ICON_W } from "@/const/desktop-layout"
import type { PackObj } from "@/types/objects"

import { cn } from "@/lib/utils"

// A Pack on the desk — a bundle of assets wrapped into one object. Like a folder it's DOM furniture,
// not a scene-drawn coin: a small sealed box with a lid band and a centre ribbon, its face carrying the
// pack's glyph (★ product · ? randomized · 🔒 locked). Click to unpack and claim the contents; drag to
// move it. Its name wears the pack colour-code; the meta pill reads the item count.

type Props = {
  pack: PackObj
  pulse?: boolean
  selected?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function DesktopPack({ pack, pulse = false, selected = false, onPointerDown, onDoubleClick, onContextMenu }: Props) {
  const glyph = pack.packGlyph ?? (pack.packType === "Randomized" ? "?" : pack.locked ? "🔒" : "★")

  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ width: ICON_W, padding: 8 }}
      className={cn(
        "flex cursor-grab touch-none flex-col items-center gap-8 rounded-lg trans-base select-none active:scale-97 active:cursor-grabbing",
        selected && "bg-white/20 outline-1 outline-dashed outline-white"
      )}>
      <div className="grid h-48 shrink-0 place-items-center">
        <div
          className={cn("relative grid h-46 w-54 place-items-center overflow-hidden rounded-[9px]", pulse && "pack-pulse")}
          style={{ background: pack.color, boxShadow: "0 5px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.4)" }}>
          {/* lid band across the top */}
          <span className="absolute inset-x-0 top-0 h-15 bg-black/20" aria-hidden />
          {/* centre ribbon */}
          <span className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-white/30" aria-hidden />
          <span className="relative text-18 leading-100 font-extrabold text-white">{glyph}</span>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <p className="w-full truncate text-center text-12 font-medium leading-120 tracking-tight" style={{ color: "#ffd7a3" }}>
          {pack.label}
        </p>
        <span className="tnum rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{pack.meta ?? pack.contents}</span>
      </div>
    </div>
  )
}
