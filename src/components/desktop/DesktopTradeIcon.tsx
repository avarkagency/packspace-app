"use client"

import { TRADE_W } from "@/const/desktop-layout"
import type { TradeRequest } from "@/types/objects"
import { ArrowRightLeft } from "lucide-react"

import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"

type Props = {
  request: TradeRequest
  onPointerDown: (e: React.PointerEvent) => void
  onOpen: () => void
}

export function DesktopTradeIcon({ request, onPointerDown, onOpen }: Props) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{ width: TRADE_W }}
      className="flex cursor-grab touch-none justify-center select-none active:cursor-grabbing">
      <span className="panel-in flex flex-col items-center gap-8">
        <span className="relative grid size-64 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/50 motion-reduce:hidden" aria-hidden />
          <span className="absolute inset-0 rounded-full bg-accent/15" aria-hidden />
          <ObjectAvatar contact={{ id: request.fromId }} size={56} className="ring-2 ring-white" />
          <span className="glass absolute -right-2 -bottom-2 grid size-24 place-items-center rounded-full ring-2 ring-black/40">
            <ArrowRightLeft className="size-12 text-[#7fd3ff]" />
          </span>
        </span>
        <span className="glass rounded-12 px-12 py-8 text-center">
          <span className="block text-13 leading-120 font-semibold text-white">{request.fromLabel} wants to trade</span>
          <span className="mt-2 block max-w-200 text-10 leading-140 text-white/70">Expires after 5 min of inactivity.</span>
        </span>
      </span>
    </button>
  )
}
