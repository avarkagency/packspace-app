"use client"

import type { TradeRequest } from "@/types/objects"
import { ArrowRightLeft } from "lucide-react"

import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"

type Props = {
  request: TradeRequest
  /** Horizontal px from screen centre — a second request lands beside the first, not on top of it. */
  offset: number
  onOpen: () => void
}

/** A live trade request landing on the desk itself, not the dock — the MMO-style "someone wants to
 *  trade" moment. Pulses until opened; opening it is the only way it goes away (there's nothing to
 *  accept or decline here, just the table it leads to). */
export function DesktopTradeIcon({ request, offset, onOpen }: Props) {
  return (
    <button
      type="button"
      data-cue-press
      onClick={onOpen}
      style={{ left: `calc(50% + ${offset}px)` }}
      className="fixed top-1/2 z-[151] -translate-x-1/2 -translate-y-1/2 cursor-pointer">
      {/* the entrance scale lives on this inner wrapper — the button itself only ever carries the
          translate that centres it, so the two transforms never fight over one property */}
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
