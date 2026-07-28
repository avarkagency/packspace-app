"use client"

import { ReceiptText, X } from "lucide-react"

import type { Receipt } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { RECEIPT_STYLE } from "./ReceiptWindow"

// The Receipts history — every settled Send / Handoff / Move, newest first. Click one to open its proof
// card. Wears the shared glass frame, and takes each action's signal colour from the proof card itself.

type Props = {
  receipts: Receipt[]
  onOpen: (r: Receipt) => void
  onClose: () => void
}

export function ReceiptsListWindow({ receipts, onOpen, onClose }: Props) {
  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: 220 }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 420 }}>
        <div className="p-24">
          <h2 className="flex items-center gap-8 text-18 leading-120 tracking-tight text-white">
            <ReceiptText className="size-20 text-[#7fd3ff]" />
            Receipts
          </h2>
          <div className="-mx-24 mt-20 h-px bg-white/20" aria-hidden />

          {receipts.length === 0 ? (
            <p className="mt-24 text-13 leading-140 text-white/50">No receipts yet. Send or Handoff an asset to create one.</p>
          ) : (
            <ul className="no-scrollbar mt-16 flex max-h-[60vh] flex-col gap-8 overflow-auto">
              {receipts.map((r) => {
                const { color, Icon } = RECEIPT_STYLE[r.action]
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(r)}
                      className="flex w-full items-center gap-12 rounded-md border border-white/10 bg-white/5 p-12 text-left trans-base hover:bg-white/10">
                      <span className="grid size-32 shrink-0 place-items-center rounded-10" style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
                        <Icon className="size-16" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-13 leading-120 font-medium text-white">
                          {r.action} · {r.give}
                        </span>
                        <span className="block truncate text-11 leading-120 text-white/50">
                          {r.counterparty} · {r.at}
                        </span>
                      </span>
                      <span className="tnum shrink-0 font-mono text-11 leading-120 text-[#8fb8ff]">{shortAddr(r.hash, 6, 4)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <BaseBtn variant="secondary" className="mt-20 w-full" onClick={onClose}>
            Close
          </BaseBtn>
        </div>
      </div>
    </div>
  )
}
