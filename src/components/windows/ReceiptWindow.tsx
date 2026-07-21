"use client"

import { BadgeCheck } from "lucide-react"

import type { Receipt } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { Badge } from "../ui/Bits"
import { Window } from "./Window"

// Every settled Send/Handoff yields a receipt / proof card (spec §3.5.6, §3.11).

export function ReceiptWindow({ receipt, z, onClose }: { receipt: Receipt; z: number; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Action", receipt.action],
    ["You gave", receipt.give]
  ]
  if (receipt.receive) rows.push(["You received", receipt.receive])
  rows.push(
    ["Counterparty", receipt.counterparty],
    ["Chain", receipt.chain],
    ["Confirmation", receipt.confirmation],
    ["Tx hash", shortAddr(receipt.hash, 10, 6)],
    ["Time", receipt.at]
  )

  return (
    <Window title="Receipt" subtitle="Proof card" tint="#34d399" width={360} z={z} onClose={onClose}>
      <div className="flex flex-col gap-14 p-16">
        <div className="flex items-center gap-10 rounded-md border border-success/40 bg-success/10 p-12">
          <BadgeCheck className="size-20 text-success" />
          <div>
            <p className="text-13 font-semibold text-success">{receipt.status}</p>
            <p className="text-11 text-muted-foreground">{receipt.action} completed all-or-nothing</p>
          </div>
          <Badge tone="success" className="ml-auto">
            verified
          </Badge>
        </div>

        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-8 px-12 py-8">
              <span className="text-11 text-muted-foreground">{k}</span>
              <span className="tnum text-12">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-11 text-muted-foreground/70">The receipt is the record, not a claims process — the protocol doesn&apos;t adjudicate disputes.</p>
      </div>
    </Window>
  )
}
