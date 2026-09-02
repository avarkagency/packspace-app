"use client"

import Image from "next/image"
import { useLayoutEffect, useRef, useState } from "react"

import type { DesktopObj } from "@/types/objects"
import { Check, TriangleAlert, X } from "lucide-react"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"
import { ObjectArt } from "@/components/desktop/object/ObjectArt"
import { chainImage } from "@/components/desktop/object/ObjectVisual"

import { dragLoop } from "@/lib/drag-loop"
import { addrStub, cn, desktopLabel, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

const DEFAULT_W = 384
const MIN_W = 296
const MIN_H = 220

type Props = {
  label: string
  items: DesktopObj[]
  z: number
  dropKey: string
  flashIds: ReadonlySet<string>
  overKey: string | null
  onClose: () => void
  onFocus: () => void
  onItemPointerDown: (obj: DesktopObj, group: DesktopObj[]) => (e: React.PointerEvent) => void
  onItemContextMenu: (obj: DesktopObj) => (e: React.MouseEvent) => void
  itemDropKey: (obj: DesktopObj) => string | undefined
  itemDimmed: (obj: DesktopObj) => boolean
}

type Frame = { x: number; y: number; w: number; h: number | null }

export function WindowFolder({
  label,
  items,
  z,
  dropKey,
  onClose,
  onFocus,
  onItemPointerDown,
  onItemContextMenu,
  flashIds,
  itemDropKey,
  itemDimmed,
  overKey
}: Props) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const frameRef = useRef<Frame | null>(null)
  const pressRef = useRef({ x: 0, y: 0 })

  // state
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())

  // data
  const pickedItems = items.filter((o) => picked.has(o.id))

  // events
  const apply = () => {
    const el = ref.current
    const f = frameRef.current
    if (!el || !f) return
    el.style.left = `${f.x}px`
    el.style.top = `${f.y}px`
    el.style.width = `${f.w}px`
    el.style.height = f.h === null ? "" : `${f.h}px`
  }

  const center = (animate = false) => {
    const el = ref.current
    const f = frameRef.current
    if (!el || !f) return
    f.x = Math.round((window.innerWidth - el.offsetWidth) / 2)
    f.y = Math.round((window.innerHeight - el.offsetHeight) / 2)
    if (animate) {
      const ease = "cubic-bezier(0.77, 0, 0.175, 1)"
      el.style.transition = `left 300ms ${ease}, top 300ms ${ease}`
      const clear = () => {
        el.style.transition = ""
        el.removeEventListener("transitionend", clear)
      }
      el.addEventListener("transitionend", clear)
      setTimeout(clear, 400)
    }
    apply()
  }

  // events
  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const f = frameRef.current
    if (!f) return
    const start = { ...f }

    dragLoop(e, {
      onMove: (dx, dy) => {
        f.x = Math.min(Math.max(start.x + dx, 8), window.innerWidth - f.w - 8)
        f.y = Math.min(Math.max(start.y + dy, 8), window.innerHeight - 96)
        apply()
      }
    })
  }

  // events
  const onResizePointerDown = (e: React.PointerEvent, corner: "sw" | "se") => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    const f = frameRef.current
    if (!el || !f) return
    const start = { ...f, h: f.h ?? el.offsetHeight }

    dragLoop(e, {
      onMove: (dx, dy) => {
        if (corner === "se") {
          f.w = Math.max(MIN_W, start.w + dx)
        } else {
          const w = Math.max(MIN_W, start.w - dx)
          f.x = start.x + (start.w - w)
          f.w = w
        }
        f.h = Math.max(MIN_H, start.h + dy)
        apply()
      }
    })
  }

  // events
  const tilePointerDown = (o: DesktopObj) => (e: React.PointerEvent) => {
    pressRef.current = { x: e.clientX, y: e.clientY }
    const group = picked.has(o.id) && pickedItems.length > 1 ? pickedItems : [o]
    onItemPointerDown(o, group)(e)
  }
  const tileClick = (o: DesktopObj) => (e: React.MouseEvent) => {
    if (Math.hypot(e.clientX - pressRef.current.x, e.clientY - pressRef.current.y) >= 6) return // that was a drag
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(o.id)) next.delete(o.id)
      else next.add(o.id)
      return next
    })
  }

  // effects
  useLayoutEffect(() => {
    if (!frameRef.current) {
      frameRef.current = { x: 0, y: 0, w: DEFAULT_W, h: null }
      center()
      return
    }
    apply()
  })

  return (
    <div
      ref={ref}
      data-drop={dropKey}
      onPointerDown={onFocus}
      style={{ zIndex: z, width: DEFAULT_W }}
      className="glass panel-in fixed top-0 left-0 flex flex-col rounded-16">
      <header
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={() => center(true)}
        className="flex shrink-0 cursor-grab items-center justify-between gap-12 p-20 pb-16 select-none active:cursor-grabbing">
        <div className="flex min-w-0 items-center gap-8">
          <h2 className="truncate text-16 leading-120 tracking-tight text-white">{label}</h2>
          <span className="tnum shrink-0 rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Close folder"
          className="grid size-28 shrink-0 cursor-pointer place-items-center rounded-md text-white/70 trans-base hover:bg-white/10 hover:text-white">
          <X className="size-16" />
        </button>
      </header>

      <div className="h-px w-full shrink-0 bg-white/20" aria-hidden />

      {items.length === 0 ? (
        <p className="flex-1 px-20 py-24 text-center text-12 leading-140 text-white/50">Empty — drop assets or contacts onto the folder to keep them here.</p>
      ) : (
        <ul className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-12" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))" }}>
          {items.map((o) => {
            const key = itemDropKey(o)
            return (
              <FolderGridItem
                key={o.id}
                obj={o}
                picked={picked.has(o.id)}
                flash={flashIds.has(o.id)}
                dropKey={key}
                dimmed={itemDimmed(o)}
                over={!!key && overKey === key}
                onPointerDown={tilePointerDown(o)}
                onClick={tileClick(o)}
                onContextMenu={onItemContextMenu(o)}
              />
            )
          })}
        </ul>
      )}

      {/* resize corners */}
      <span onPointerDown={(e) => onResizePointerDown(e, "sw")} className="absolute bottom-0 left-0 z-10 size-16 cursor-sw-resize" aria-hidden />
      <span onPointerDown={(e) => onResizePointerDown(e, "se")} className="absolute right-0 bottom-0 z-10 size-16 cursor-se-resize" aria-hidden />
    </div>
  )
}

function FolderGridItem({
  obj,
  picked,
  flash,
  dropKey,
  dimmed,
  over,
  onPointerDown,
  onClick,
  onContextMenu
}: {
  obj: DesktopObj
  picked: boolean
  flash: boolean
  dropKey?: string
  dimmed: boolean
  over: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const delta = obj.class === "asset" ? dayChange(obj.symbol) : undefined

  return (
    <li
      data-drop={dropKey}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative flex cursor-grab touch-none flex-col items-center gap-8 rounded-lg p-8 trans-base select-none hover:bg-white/10 active:scale-97 active:cursor-grabbing",
        dimmed && "opacity-40",
        dropKey && "bg-white/10 outline-1 outline-dashed outline-white/40",
        (picked || over) && "bg-white/20 outline-1 outline-dashed outline-white hover:bg-white/20"
      )}>
      {flash && (
        <span aria-hidden className="split-flash pointer-events-none absolute inset-0 rounded-lg bg-action-split/20 outline-1 outline-action-split/50" />
      )}
      <span className="relative grid size-48 shrink-0 place-items-center">
        <ObjectArt obj={obj} />
        <span className="pointer-events-none absolute -right-px -bottom-px">
          {obj.class === "person" ? (
            obj.trust === "unconfirmed" ? (
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
              draggable={false}
              className="size-12 rounded-full object-cover ring-1 ring-white/40"
            />
          ) : null}
        </span>
      </span>

      <span className="flex w-full flex-col items-center gap-4">
        <p className="tnum w-full truncate text-center text-12 font-medium leading-120 tracking-tight text-white">{over ? "Combine" : desktopLabel(obj)}</p>
        <span
          className={cn(
            "tnum flex max-w-full items-center gap-4 rounded-full bg-white/20 py-2 pl-6 text-10 leading-120 text-white/90",
            delta !== undefined ? "pr-2" : "pr-6"
          )}>
          <span className="truncate">
            {obj.class === "asset"
              ? usd(obj.usd, { cents: false })
              : obj.trust === "unconfirmed"
                ? "Not in contacts"
                : obj.address
                  ? addrStub(obj.address)
                  : obj.handle}
          </span>
          {delta !== undefined && <BaseChangeTag pct={delta} />}
        </span>
      </span>
    </li>
  )
}
