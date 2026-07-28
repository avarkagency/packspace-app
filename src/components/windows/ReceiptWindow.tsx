"use client"

import { ArrowRightLeft, ArrowUpRight, BadgeCheck, WalletCards, X } from "lucide-react"

import type { Receipt } from "@/lib/types"
import { cn, shortAddr } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { ConfettiShader } from "../canvas/ConfettiShader"

// Every settled Send/Handoff/Move yields a receipt / proof card (spec §3.5.6, §3.11). Wears the same
// glass frame as its sibling modals — blurred desk, floating close, one panel — with the action's own
// signal colour on the header tile (Send green, Trade purple, Move blue).

/** Per-action signal colour, mark, and what its route row is called. A Move never leaves your custody,
 *  so its counterparty is the other wallet and its route row reads "Route" like a Send's. */
export const RECEIPT_STYLE = {
  Send: { color: "#3ddc84", Icon: ArrowUpRight, routeLabel: "Route" },
  Trade: { color: "#c4b6ff", Icon: ArrowRightLeft, routeLabel: "Settlement" },
  Move: { color: "#7fd3ff", Icon: WalletCards, routeLabel: "Route" }
} as const

export function ReceiptWindow({ receipt, z, onClose }: { receipt: Receipt; z: number; onClose: () => void }) {
  // data
  const { color, Icon, routeLabel } = RECEIPT_STYLE[receipt.action]
  const isMove = receipt.action === "Move"

  const rows: [string, string][] = [[isMove ? "Moved" : "You gave", receipt.give]]
  if (receipt.receive) rows.push(["You received", receipt.receive])
  rows.push([isMove ? "To wallet" : "Counterparty", receipt.counterparty], ["Chain", receipt.chain])
  if (receipt.route) rows.push([routeLabel, receipt.route])
  rows.push(["Confirmation", receipt.confirmation], ["Tx hash", shortAddr(receipt.hash, 10, 6)], ["Time", receipt.at])

  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: z }}>
      {/* the desk falls out of focus */}
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      {/* the transaction settled — a confetti fountain rises behind the proof card in celebration */}
      <ConfettiShader className="absolute inset-0" />

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
