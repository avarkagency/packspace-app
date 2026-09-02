"use client"

import type { Receipt } from "@/types/objects"
import { ReceiptText } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { shortAddr } from "@/lib/utils"

import { RECEIPT_STYLE } from "./WindowReceipt"

type Props = {
  receipts: Receipt[]
  onOpen: (r: Receipt) => void
  onClose: () => void
}

export function WindowReceipts({ receipts, onOpen, onClose }: Props) {
  return (
    <WindowShell z={220} width={420} onClose={onClose}>
      <div className="p-24">
        <WindowHeading pad={24} icon={<ReceiptText className="size-20 text-[#7fd3ff]" />} title="Receipts" />

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
                    <span
                      className="grid size-32 shrink-0 place-items-center rounded-10"
                      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
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
    </WindowShell>
  )
}
