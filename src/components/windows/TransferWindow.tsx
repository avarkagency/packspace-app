"use client"

import { useState } from "react"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"
import { units, usd } from "@/lib/utils"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { HandoffWindow } from "./HandoffWindow"
import { SendWindow } from "./SendWindow"
import { Window } from "./Window"

// The modal a wallet drop opens — for one asset or several: a multi-select dropped onto a contact
// cascades into this single window (the tokens listed together above the choice) rather than a stack
// of one-asset modals. ONE window for the whole flow: the frame stays mounted while its content moves
// from the choice the drop left open — Send or Trade — into that action's own body, so choosing never
// fades one modal out and another in. Send and Trade stay separate components on purpose; this only
// fronts them, so either can be reworked without touching the other.

type Props = {
  assets: AssetObj[]
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

const TITLE = { choose: "Transfer", send: "Send", handoff: "Trade" } as const

export function TransferWindow({ assets, to, z, onClose, onSettle, onLog }: Props) {
  // state
  const [action, setAction] = useState<"send" | "handoff" | null>(null)

  // data
  const lead = assets[0]
  const many = assets.length > 1
  const subtitle = many ? `${assets.length} assets → ${to.label}` : `${units(lead.balance)} ${lead.symbol} → ${to.label}`

  return (
    <Window
      title={TITLE[action ?? "choose"]}
      subtitle={subtitle}
      tint={objectTint(lead)}
      icon={
        many ? (
          // the dropped set, worn as a fanned stack in the header
          <span className="flex shrink-0 -space-x-10">
            {assets.slice(0, 3).map((a) => (
              <ObjectMark key={a.id} obj={a} />
            ))}
          </span>
        ) : (
          <ObjectMark obj={lead} />
        )
      }
      width={440}
      z={z}
      onClose={onClose}>
      {action === "send" ? (
        <SendWindow assets={assets} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />
      ) : action === "handoff" ? (
        <HandoffWindow seeds={assets} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />
      ) : (
        <>
          {/* what's on the table — only worth a list when there's more than the subtitle already says */}
          {many && (
            <ul className="flex flex-col gap-8 border-b border-border px-20 py-14">
              {assets.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-12">
                  <span className="flex min-w-0 items-center gap-8">
                    <ObjectMark obj={a} size={20} />
                    <span className="tnum truncate text-12 font-medium">
                      {units(a.balance)} {a.symbol}
                    </span>
                  </span>
                  <span className="tnum text-12 text-muted-foreground">{usd(a.usd, { cents: false })}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-12 p-20">
            <TransferChoice
              label="Send"
              blurb={`Give ${many ? "them" : "it"} to ${to.label} — one-way, nothing comes back.`}
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
        </>
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
