"use client"

import { useState } from "react"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"
import { units } from "@/lib/utils"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { HandoffWindow } from "./HandoffWindow"
import { SendWindow } from "./SendWindow"
import { Window } from "./Window"

// The modal a wallet drop opens. ONE window for the whole flow: the frame stays mounted while its
// content moves from the choice the drop left open — Send or Trade — into that action's own body, so
// choosing never fades one modal out and another in. Send and Trade stay separate components on
// purpose; this only fronts them, so either can be reworked without touching the other.

type Props = {
  asset: AssetObj
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

const TITLE = { choose: "Transfer", send: "Send", handoff: "Trade" } as const

export function TransferWindow({ asset, to, z, onClose, onSettle, onLog }: Props) {
  // state
  const [action, setAction] = useState<"send" | "handoff" | null>(null)

  return (
    <Window
      title={TITLE[action ?? "choose"]}
      subtitle={`${units(asset.balance)} ${asset.symbol} → ${to.label}`}
      tint={objectTint(asset)}
      icon={<ObjectMark obj={asset} />}
      width={440}
      z={z}
      onClose={onClose}>
      {action === "send" ? (
        <SendWindow asset={asset} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />
      ) : action === "handoff" ? (
        <HandoffWindow seed={asset} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />
      ) : (
        <div className="grid grid-cols-2 gap-12 p-20">
          <TransferChoice
            label="Send"
            blurb={`Give it to ${to.label} — one-way, nothing comes back.`}
            color="var(--action-send)"
            onClick={() => setAction("send")}
          />
          <TransferChoice
            label="Trade"
            blurb={`Propose a swap — both sides settle together or not at all.`}
            color="var(--action-trade)"
            onClick={() => setAction("handoff")}
          />
        </div>
      )}

      {action && (
        <div className="border-t border-border px-20 py-10">
          <button onClick={() => setAction(null)} className="cursor-pointer text-12 text-muted-foreground trans-base hover:text-foreground">
            ← Back
          </button>
        </div>
      )}
    </Window>
  )
}

function TransferChoice({ label, blurb, color, onClick }: { label: string; blurb: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: `color-mix(in srgb, ${color} 35%, var(--border))` }}
      className="flex cursor-pointer flex-col items-start gap-6 rounded-lg border p-14 text-left trans-base hover:bg-muted/60">
      <span className="text-14 font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-12 leading-140 text-muted-foreground">{blurb}</span>
    </button>
  )
}
