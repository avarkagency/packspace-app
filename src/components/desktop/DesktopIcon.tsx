"use client"

import Image from "next/image"
import { memo, useEffect, useRef } from "react"

import { ICON_PAD, ICON_SLOT, ICON_W } from "@/const/desktop-layout"
import { coinHoverProps, registerCoinSlot } from "@/stores/coin"
import type { DesktopObj } from "@/types/objects"
import { Check, History, ShieldX, TriangleAlert } from "lucide-react"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"
import { BaseRenameInput } from "@/components/base/BaseRenameInput"
import { chainImage, objectNameColor } from "@/components/desktop/object/ObjectVisual"

import { addrStub, cn, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

type Props = {
  obj: DesktopObj
  label: string
  dropKey?: string
  dimmed?: boolean
  target?: boolean
  over?: boolean
  selected?: boolean
  flash?: boolean
  anyDragging?: boolean
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

  // data
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
            : { text: obj.address ? addrStub(obj.address) : obj.handle }

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
      {flash && (
        <span aria-hidden className="split-flash pointer-events-none absolute inset-0 rounded-lg bg-action-split/20 outline-1 outline-action-split/50" />
      )}

      <div ref={slotRef} {...coinHoverProps(obj.id)} style={{ width: ICON_SLOT, height: ICON_SLOT }} className="relative shrink-0">
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
          <BaseRenameInput value={label} ariaLabel="Rename wallet" className="border-accent" onCommit={onRename} onCancel={onRenameCancel} />
        ) : (
          <p
            className="tnum w-full truncate text-center text-12 font-medium leading-120 tracking-tight trans-base"
            style={{ color: over ? "#ffffff" : objectNameColor(obj) }}>
            {over ? (obj.class === "person" ? "Drop" : "Combine") : label}
          </p>
        )}

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
