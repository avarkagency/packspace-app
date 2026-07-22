"use client"

import { ArrowRightLeft, ArrowUpRight, BadgeCheck, X } from "lucide-react"

import type { Receipt } from "@/lib/types"
import { cn, shortAddr } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"

// Every settled Send/Handoff yields a receipt / proof card (spec §3.5.6, §3.11). Wears the same glass
// frame as its sibling modals — blurred desk, floating close, one panel — with the action's own signal
// colour on the header tile (Send green, Trade purple).

export function ReceiptWindow({ receipt, z, onClose }: { receipt: Receipt; z: number; onClose: () => void }) {
  // data
  const isSend = receipt.action === "Send"
  const color = isSend ? "#3ddc84" : "#c4b6ff"
  const Icon = isSend ? ArrowUpRight : ArrowRightLeft

  const rows: [string, string][] = [["You gave", receipt.give]]
  if (receipt.receive) rows.push(["You received", receipt.receive])
  rows.push(["Counterparty", receipt.counterparty], ["Chain", receipt.chain])
  if (receipt.route) rows.push([isSend ? "Route" : "Settlement", receipt.route])
  rows.push(["Confirmation", receipt.confirmation], ["Tx hash", shortAddr(receipt.hash, 10, 6)], ["Time", receipt.at])

  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: z }}>
      {/* the desk falls out of focus */}
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 420 }}>
        <div className="p-28">
          <div className="flex items-center gap-12">
            <span
              className="grid size-40 shrink-0 place-items-center rounded-12"
              style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
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

          <p className="mt-20 text-11 leading-140 text-white/50">The receipt is the record, not a claims process — the protocol doesn&apos;t adjudicate disputes.</p>

          <BaseBtn className="mt-24 w-full" onClick={onClose}>
            Done
          </BaseBtn>
        </div>
      </div>
    </div>
  )
}
