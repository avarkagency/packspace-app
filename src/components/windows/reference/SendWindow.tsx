"use client"

// PARKED — not wired up. The live SendWindow/HandoffWindow are stubs while their design is reworked;
// this is the full implementation kept verbatim so it can be brought back. There's no git history in this
// project to recover it from, which is why it lives as a file.
//
// It still typechecks and lints, deliberately: if a shared type moves under it, you'll hear about it here
// rather than on the day you re-wire it.

import { useRef, useState } from "react"

import { ArrowRight, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"

import { HIGH_VALUE_USD } from "@/lib/data"
import type { AssetObj, PersonObj, Receipt } from "@/lib/types"
import { cn, fakeHash, units, usd } from "@/lib/utils"

import { ObjectIcon, objectTint } from "../../canvas/objectVisual"
import { Button } from "../../ui/Bits"
import { Window } from "../Window"

type Props = {
  asset: AssetObj
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

type Phase = "draft" | "signing" | "pending" | "done"

export function SendWindow({ asset, to, z, onClose, onSettle, onLog }: Props) {
  // refs
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // state
  const [amount, setAmount] = useState(Math.min(asset.balance, asset.kind === "nft" ? 1 : asset.balance))
  const [phase, setPhase] = useState<Phase>("draft")
  const [typed, setTyped] = useState("")

  // data
  const tint = objectTint(asset)
  const valueUsd = asset.kind === "nft" ? asset.usd : (asset.usd / asset.balance) * amount
  const highValue = valueUsd >= HIGH_VALUE_USD
  const blocked = to.compromised
  const caution = to.retired || to.trust === "unconfirmed"
  const typeOk = !highValue || typed.trim().toLowerCase() === to.label.toLowerCase()
  const canSign = phase === "draft" && amount > 0 && !blocked && typeOk

  // events
  const sign = () => {
    if (!canSign) return
    setPhase("signing")
    onLog(`SEND · signing ${units(amount)} ${asset.symbol} → ${to.label}`)
    timers.current.push(
      setTimeout(() => setPhase("pending"), 800),
      setTimeout(() => {
        setPhase("done")
        const r: Receipt = {
          id: `rcpt-${asset.id}-${to.id}`,
          action: "Send",
          give: `${units(amount)} ${asset.symbol}`,
          counterparty: to.label,
          chain: asset.chain ?? "Base",
          hash: fakeHash(`send-${asset.id}-${to.id}-${amount}`),
          confirmation: highValue ? "type-to-confirm" : "one-tap",
          status: "Settled",
          at: new Date().toLocaleTimeString("en-US", { hour12: false })
        }
        onLog(`SETTLED ✓ Send · ${r.hash.slice(0, 10)}…`)
        onSettle(r)
      }, 2000)
    )
  }

  return (
    <Window
      title="Send"
      subtitle="Direct one-way transfer"
      tint={tint}
      width={440}
      z={z}
      onClose={onClose}
      footer={
        phase === "done" ? (
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="flex items-center gap-8">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-[2]" onClick={sign} disabled={!canSign}>
              {phase === "signing" && <Loader2 className="animate-spin" />}
              {phase === "draft" && "Sign & Send"}
              {phase === "signing" && "Signing…"}
              {phase === "pending" && "Broadcasting…"}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-16 p-16">
        {/* directional summary: asset → arrow → person */}
        <div className="flex items-center gap-12">
          <div className="fui-glass flex flex-1 items-center gap-8 rounded-md p-10">
            <span className="grid size-28 place-items-center rounded-sm" style={{ background: `${tint}1a`, color: tint, border: `1px solid ${tint}55` }}>
              <ObjectIcon obj={asset} className="size-16" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-12 font-medium">{asset.label}</p>
              <p className="tnum text-10 text-muted-foreground">{asset.chain}</p>
            </div>
          </div>
          <ArrowRight className="size-18 shrink-0 text-accent" />
          <div className="fui-glass flex flex-1 items-center gap-8 rounded-md p-10">
            <span className="grid size-28 place-items-center rounded-full text-12 font-semibold" style={{ background: `hsl(${to.hue} 70% 22%)`, color: `hsl(${to.hue} 80% 70%)` }}>
              {to.label[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-12 font-medium">{to.label}</p>
              <p className="tnum text-10 text-muted-foreground">{to.handle}</p>
            </div>
          </div>
        </div>

        {/* amount */}
        {asset.kind !== "nft" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <span className="text-11 tracking-wide text-muted-foreground uppercase">Amount</span>
              <button className="text-11 text-accent" onClick={() => setAmount(asset.balance)} disabled={phase !== "draft"}>
                Max {units(asset.balance)}
              </button>
            </div>
            <div className="fui-glass flex items-baseline gap-8 rounded-md px-12 py-10">
              <input
                type="number"
                value={amount}
                min={0}
                max={asset.balance}
                disabled={phase !== "draft"}
                onChange={(e) => setAmount(Math.min(asset.balance, Math.max(0, Number(e.target.value))))}
                className="tnum w-full bg-transparent text-24 font-semibold text-foreground outline-none"
              />
              <span className="tnum text-13 text-muted-foreground">{asset.symbol}</span>
            </div>
            <input
              type="range"
              min={0}
              max={asset.balance}
              step={asset.balance / 100}
              value={amount}
              disabled={phase !== "draft"}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-10 w-full accent-[color:var(--accent)]"
            />
          </div>
        )}

        {/* Transaction Interpreter (spec §3.11) */}
        <div className="rounded-md border border-hairline bg-accent-dim/30 p-12">
          <p className="mb-4 text-10 tracking-[0.14em] text-accent uppercase">Transaction Interpreter</p>
          <p className="text-13 leading-140">
            You will send <span className="tnum font-semibold text-foreground">{asset.kind === "nft" ? asset.label : `${units(amount)} ${asset.symbol}`}</span> ({usd(valueUsd)}) to{" "}
            <span className="font-semibold text-foreground">{to.label}</span> on {asset.chain}.{" "}
            <span className="text-danger">This cannot be reversed.</span>
          </p>
        </div>

        {/* Safety Engine row */}
        <SafetyRow blocked={blocked} caution={caution} to={to} />

        {/* high-value type-to-confirm */}
        {highValue && !blocked && phase === "draft" && (
          <div>
            <p className="mb-6 text-11 text-warning">High-value transfer — type the recipient name to confirm.</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={to.label}
              className={cn(
                "fui-glass w-full rounded-md px-12 py-8 text-13 outline-none",
                typed && (typeOk ? "border-success/50" : "border-danger/50")
              )}
            />
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-md border border-success/40 bg-success/10 p-12 text-13 text-success">
            Settled. A receipt object was added to your workspace. No recipient confirmation was required — Send is a give.
          </div>
        )}

        {phase === "draft" && (
          <p className="text-11 text-muted-foreground/80">
            Send has no recipient confirmation (it&apos;s a give, like a normal transfer). To require both sides to confirm, use{" "}
            <span className="text-accent">Handoff</span> instead.
          </p>
        )}
      </div>
    </Window>
  )
}

function SafetyRow({ blocked, caution, to }: { blocked?: boolean; caution?: boolean; to: PersonObj }) {
  if (blocked)
    return (
      <div className="flex items-start gap-8 rounded-md border border-danger/40 bg-danger/10 p-12">
        <ShieldAlert className="mt-1 size-16 shrink-0 text-danger" />
        <div>
          <p className="text-12 font-semibold text-danger">Blocked — destination flagged COMPROMISED</p>
          <p className="text-11 text-muted-foreground">This identity is in the Compromise Registry. Do not send here.</p>
        </div>
      </div>
    )
  if (caution)
    return (
      <div className="flex items-start gap-8 rounded-md border border-warning/40 bg-warning/10 p-12">
        <ShieldQuestion className="mt-1 size-16 shrink-0 text-warning" />
        <div>
          <p className="text-12 font-semibold text-warning">{to.retired ? "Caution — address RETIRED" : "Caution — unconfirmed contact"}</p>
          <p className="text-11 text-muted-foreground">{to.retired ? "The owner marked this address as no longer in use." : "You haven't confirmed this contact yet."}</p>
        </div>
      </div>
    )
  return (
    <div className="flex items-center gap-8 rounded-md border border-success/30 bg-success/5 p-12">
      <ShieldCheck className="size-16 shrink-0 text-success" />
      <p className="text-12 text-success">Safety Engine: safe — {to.trust} contact, address active.</p>
    </div>
  )
}
