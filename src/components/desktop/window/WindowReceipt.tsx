"use client"

import type { Receipt } from "@/types/objects"
import { ArrowRightLeft, ArrowUpRight, BadgeCheck, WalletCards } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { FxConfetti } from "@/components/desktop/fx/FxConfetti"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cn, shortAddr } from "@/lib/utils"

export const RECEIPT_STYLE = {
  Send: { color: "#3ddc84", Icon: ArrowUpRight, routeLabel: "Route" },
  Trade: { color: "#c4b6ff", Icon: ArrowRightLeft, routeLabel: "Settlement" },
  Move: { color: "#7fd3ff", Icon: WalletCards, routeLabel: "Route" }
} as const

export function WindowReceipt({ receipt, z, onClose }: { receipt: Receipt; z: number; onClose: () => void }) {
  // data
  const { color, Icon, routeLabel } = RECEIPT_STYLE[receipt.action]
  const isMove = receipt.action === "Move"

  const rows: [string, string][] = [[isMove ? "Moved" : "You gave", receipt.give]]
  if (receipt.receive) rows.push(["You received", receipt.receive])
  rows.push([isMove ? "To wallet" : "Counterparty", receipt.counterparty], ["Chain", receipt.chain])
  if (receipt.route) rows.push([routeLabel, receipt.route])
  rows.push(["Confirmation", receipt.confirmation], ["Tx hash", shortAddr(receipt.hash, 10, 6)], ["Time", receipt.at])

  return (
    <WindowShell z={z} width={420} onClose={onClose} behind={<FxConfetti className="absolute inset-0" />}>
      <div className="p-28">
        <div className="flex items-center gap-12">
          <span className="grid size-40 shrink-0 place-items-center rounded-12" style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
            <Icon className="size-20" />
          </span>
          <div className="min-w-0">
            <h2 className="text-18 leading-120 tracking-tight text-white">{receipt.action} settled</h2>
            <p className="text-12 leading-120 text-white/60">Proof card</p>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-4 rounded-full bg-[#13e192]/20 px-8 py-4 text-11 leading-120 font-medium text-[#13e192]">
            <BadgeCheck className="size-12" /> {receipt.status}
          </span>
        </div>

        <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

        <dl className="mt-24 flex flex-col gap-12">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-12">
              <dt className="text-13 leading-120 tracking-tight text-white/60">{k}</dt>
              <dd className={cn("tnum truncate text-13 leading-120 tracking-tight text-white", k === "Tx hash" && "font-mono text-[#8fb8ff]")}>{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-20 text-11 leading-140 text-white/50">
          The receipt is the record, not a claims process — the protocol doesn&apos;t adjudicate disputes.
        </p>

        <BaseBtn className="mt-24 w-full" onClick={onClose}>
          Done
        </BaseBtn>
      </div>
    </WindowShell>
  )
}
