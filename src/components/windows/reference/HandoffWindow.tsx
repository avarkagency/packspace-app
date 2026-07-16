"use client"

// PARKED — not wired up. The live SendWindow/HandoffWindow are stubs while their design is reworked;
// this is the full implementation kept verbatim so it can be brought back. There's no git history in this
// project to recover it from, which is why it lives as a file.
//
// It still typechecks and lints, deliberately: if a shared type moves under it, you'll hear about it here
// rather than on the day you re-wire it.

import { useEffect, useRef, useState } from "react"

import { Check, Loader2, Lock, Plus, Unlock, X } from "lucide-react"

import { ASSETS, COUNTERPARTY_OFFERS, HIGH_VALUE_USD } from "@/lib/data"
import type { AssetObj, DealItem, PersonObj, Receipt } from "@/lib/types"
import { cn, fakeHash, units, usd } from "@/lib/utils"

import { ObjectIcon, objectTint } from "../../canvas/objectVisual"
import { Badge, Button } from "../../ui/Bits"
import { Window } from "../Window"

type Props = {
  seed: AssetObj
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

type Phase = "negotiate" | "launching" | "settled"

const STEPS = ["Negotiate", "Lock", "Review", "Confirm", "Launch", "Settled"] as const

export function HandoffWindow({ seed, to, z, onClose, onSettle, onLog }: Props) {
  // refs
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // state
  const [yourItems, setYourItems] = useState<DealItem[]>([
    { key: seed.id, asset: seed, amount: seed.kind === "nft" ? 1 : Math.min(500, seed.balance) }
  ])
  const [theirItems, setTheirItems] = useState<DealItem[]>([])
  const [requested, setRequested] = useState(false)
  const [youLocked, setYouLocked] = useState(false)
  const [themLocked, setThemLocked] = useState(false)
  const [youConfirmed, setYouConfirmed] = useState(false)
  const [themConfirmed, setThemConfirmed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [phase, setPhase] = useState<Phase>("negotiate")
  const [typed, setTyped] = useState("")

  // data
  const bothLocked = youLocked && themLocked
  const reviewing = bothLocked && countdown > 0
  const confirmReady = bothLocked && countdown === 0 && !youConfirmed
  const giveUsd = sumUsd(yourItems)
  const receiveUsd = sumUsd(theirItems)
  const highValue = Math.max(giveUsd, receiveUsd) >= HIGH_VALUE_USD
  const typeOk = !highValue || typed.trim().toLowerCase() === to.label.toLowerCase()

  const direction =
    yourItems.length && theirItems.length ? "trading" : yourItems.length ? "sending" : "requesting"
  const summary = buildSummary(direction, yourItems, theirItems, to, seed.chain ?? "Base")

  const currentStep: (typeof STEPS)[number] =
    phase === "settled" ? "Settled" : phase === "launching" ? "Launch" : youConfirmed || confirmReady ? "Confirm" : reviewing ? "Review" : youLocked || themLocked ? "Lock" : "Negotiate"

  // events
  const breakLocks = () => {
    if (!youLocked && !themLocked && !youConfirmed && !themConfirmed) return
    setYouLocked(false)
    setThemLocked(false)
    setYouConfirmed(false)
    setThemConfirmed(false)
    setCountdown(0)
    onLog("HANDOFF · locks broken — terms changed")
  }

  const setYourAmount = (key: string, amt: number) => {
    breakLocks()
    setYourItems((items) => items.map((i) => (i.key === key ? { ...i, amount: amt } : i)))
  }
  const removeYour = (key: string) => {
    breakLocks()
    setYourItems((items) => items.filter((i) => i.key !== key))
  }
  const addYour = (asset: AssetObj) => {
    breakLocks()
    setYourItems((items) => [...items, { key: asset.id, asset, amount: asset.kind === "nft" ? 1 : Math.min(100, asset.balance) }])
  }

  const requestBack = () => {
    if (requested) return
    breakLocks()
    setRequested(true)
    onLog("HANDOFF · requested return · negotiating…")
    timers.current.push(
      setTimeout(() => {
        setTheirItems([{ key: COUNTERPARTY_OFFERS[0].id, asset: COUNTERPARTY_OFFERS[0], amount: 1 }])
        onLog(`HANDOFF · ${to.label} offered ${COUNTERPARTY_OFFERS[0].label}`)
      }, 900)
    )
  }

  const lockYourSide = () => {
    setYouLocked(true)
    onLog("LOCK · your side frozen")
  }
  const confirm = () => {
    if (!typeOk) return
    setYouConfirmed(true)
    onLog("CONFIRM · you confirmed the locked deal")
  }
  const cancel = () => {
    onLog("HANDOFF · cancelled (nothing was held)")
    onClose()
  }

  // effects — the fake counterparty + settlement clock (all setState is inside timers, never sync)
  useEffect(() => {
    if (!youLocked || themLocked || phase !== "negotiate") return
    const t = setTimeout(() => {
      setThemLocked(true)
      setCountdown(3)
      onLog(`LOCK · ${to.label} locked their side`)
    }, 1300)
    return () => clearTimeout(t)
  }, [youLocked, themLocked, phase, to, onLog])

  useEffect(() => {
    if (!bothLocked || countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [bothLocked, countdown])

  useEffect(() => {
    if (!youConfirmed || themConfirmed) return
    const t = setTimeout(() => {
      setThemConfirmed(true)
      setPhase("launching")
      onLog(`CONFIRM · ${to.label} confirmed → LAUNCH (all-or-nothing)`)
      const settle = setTimeout(() => {
        setPhase("settled")
        const r: Receipt = {
          id: `rcpt-handoff-${seed.id}-${to.id}`,
          action: "Trade",
          give: yourItems.map((i) => itemLabel(i)).join(" + ") || "—",
          receive: theirItems.map((i) => itemLabel(i)).join(" + ") || undefined,
          counterparty: to.label,
          chain: seed.chain ?? "Base",
          hash: fakeHash(`handoff-${seed.id}-${to.id}`),
          confirmation: highValue ? "type-to-confirm (both sides)" : "lock + confirm (both sides)",
          status: "Settled",
          at: new Date().toLocaleTimeString("en-US", { hour12: false })
        }
        onLog(`SETTLED ✓ Handoff · ${r.hash.slice(0, 10)}…`)
        onSettle(r)
      }, 1700)
      timers.current.push(settle)
    }, 1400)
    return () => clearTimeout(t)
  }, [youConfirmed, themConfirmed, to, seed, yourItems, theirItems, highValue, onLog, onSettle])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const locked = phase !== "negotiate" || youLocked
  const addable = ASSETS.filter((a) => !yourItems.some((i) => i.key === a.id)).slice(0, 3)

  return (
    <Window
      title="Trade"
      subtitle="Confirmed exchange — both sides must lock & confirm"
      width={620}
      z={z}
      onClose={onClose}
      footer={<Footer />}
    >
      <div className="flex flex-col gap-14 p-16">
        {/* phase stepper */}
        <div className="flex items-center gap-4">
          {STEPS.map((s, i) => {
            const done = STEPS.indexOf(currentStep) > i
            const now = s === currentStep
            return (
              <div key={s} className="flex flex-1 items-center gap-4">
                <div className="flex flex-col items-center gap-4">
                  <span
                    className={cn(
                      "grid size-18 place-items-center rounded-full border text-10 tnum trans-base",
                      now ? "border-accent bg-accent text-accent-foreground" : done ? "border-success/60 text-success" : "border-border text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-10" /> : i + 1}
                  </span>
                </div>
                <span className={cn("text-10 tracking-wide uppercase", now ? "text-accent" : done ? "text-success/80" : "text-muted-foreground/60")}>{s}</span>
                {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-success/40" : "bg-border")} />}
              </div>
            )
          })}
        </div>

        {/* live header + self-writing summary */}
        <div className="rounded-md border border-hairline bg-accent-dim/25 p-12">
          <p className="text-11 tracking-[0.14em] text-accent uppercase">
            You&apos;re {direction}
          </p>
          <p className="mt-4 text-13 leading-140 text-foreground/90">{summary}</p>
        </div>

        {/* two sides */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-10">
          <Side
            title="You"
            locked={youLocked}
            confirmed={youConfirmed}
            items={yourItems}
            editable={!locked && phase === "negotiate"}
            onAmount={setYourAmount}
            onRemove={removeYour}
            totalUsd={giveUsd}
            emptyHint="Drag assets here"
            footer={
              !youLocked &&
              phase === "negotiate" &&
              addable.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {addable.map((a) => (
                    <button key={a.id} onClick={() => addYour(a)} className="flex items-center gap-4 rounded-sm border border-border px-6 py-4 text-10 text-muted-foreground trans-base hover:border-accent/50 hover:text-accent">
                      <Plus className="size-10" /> {a.symbol}
                    </button>
                  ))}
                </div>
              )
            }
          />

          <div className="flex flex-col items-center justify-center gap-6 px-2">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent" />
            <span className="tnum rounded-sm border border-hairline bg-background px-6 py-4 text-10 text-accent">⇄</span>
            <div className="h-full w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent" />
          </div>

          <Side
            title={to.label}
            locked={themLocked}
            confirmed={themConfirmed}
            items={theirItems}
            editable={false}
            totalUsd={receiveUsd}
            hue={to.hue}
            emptyHint="Nothing requested"
            footer={
              !requested &&
              theirItems.length === 0 &&
              phase === "negotiate" && (
                <button onClick={requestBack} className="flex items-center gap-4 rounded-sm border border-border px-8 py-4 text-10 text-muted-foreground trans-base hover:border-accent/50 hover:text-accent">
                  <Plus className="size-10" /> Request something back
                </button>
              )
            }
          />
        </div>

        {/* review countdown */}
        {reviewing && (
          <div className="flex items-center gap-8 rounded-md border border-warning/40 bg-warning/10 p-10 text-12 text-warning">
            <Lock className="size-14" />
            Both sides locked. Reviewing the exact terms — confirm unlocks in <span className="tnum font-semibold">{countdown}s</span>.
          </div>
        )}

        {/* high-value type-to-confirm */}
        {confirmReady && highValue && (
          <div>
            <p className="mb-6 text-11 text-warning">High-value handoff — type the counterparty name ({to.label}) to confirm.</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={to.label}
              className={cn("fui-glass w-full rounded-md px-12 py-8 text-13 outline-none", typed && (typeOk ? "border-success/50" : "border-danger/50"))}
            />
          </div>
        )}

        {phase === "settled" && (
          <div className="rounded-md border border-success/40 bg-success/10 p-12 text-13 text-success">
            Settled all-or-nothing. Both sides confirmed the identical locked terms. A receipt object was added to your workspace.
          </div>
        )}

        <p className="text-11 text-muted-foreground/70">
          No escrow — negotiation is off-chain; the only on-chain event is settlement launch. Both parties confirm in every mode, including one-way. Cancel is free at any stage before launch.
        </p>
      </div>
    </Window>
  )

  // ── footer action bar (varies by phase) ─────────────────────────────────────
  function Footer() {
    if (phase === "settled")
      return (
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      )
    if (phase === "launching")
      return (
        <div className="flex items-center justify-center gap-8 text-13 text-accent">
          <Loader2 className="size-16 animate-spin" /> Launching — all-or-nothing settlement…
        </div>
      )
    if (youConfirmed)
      return (
        <div className="flex items-center justify-center gap-8 text-13 text-muted-foreground">
          <Loader2 className="size-16 animate-spin" /> Waiting for {to.label} to confirm…
        </div>
      )
    if (confirmReady)
      return (
        <div className="flex items-center gap-8">
          <Button variant="ghost" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
          <Button className="flex-[2]" onClick={confirm} disabled={!typeOk}>
            <Check /> Confirm exact terms
          </Button>
        </div>
      )
    if (reviewing)
      return (
        <div className="flex items-center gap-8">
          <Button variant="ghost" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
          <Button className="flex-[2]" disabled>
            Locked review — {countdown}s
          </Button>
        </div>
      )
    if (youLocked && !themLocked)
      return (
        <div className="flex items-center gap-8">
          <Button variant="ghost" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
          <Button className="flex-[2]" disabled>
            <Loader2 className="size-16 animate-spin" /> Waiting for {to.label} to lock…
          </Button>
        </div>
      )
    return (
      <div className="flex items-center gap-8">
        <Button variant="ghost" className="flex-1" onClick={cancel}>
          Cancel
        </Button>
        <Button className="flex-[2]" onClick={lockYourSide} disabled={yourItems.length === 0 && theirItems.length === 0}>
          <Lock /> Lock my side
        </Button>
      </div>
    )
  }
}

// ── side column ────────────────────────────────────────────────────────────────
function Side({
  title,
  locked,
  confirmed,
  items,
  editable,
  onAmount,
  onRemove,
  totalUsd,
  emptyHint,
  hue,
  footer
}: {
  title: string
  locked: boolean
  confirmed: boolean
  items: DealItem[]
  editable: boolean
  onAmount?: (key: string, amt: number) => void
  onRemove?: (key: string) => void
  totalUsd: number
  emptyHint: string
  hue?: number
  footer?: React.ReactNode
}) {
  return (
    <div className={cn("fui-glass flex flex-col gap-8 rounded-md p-10 trans-base", locked && "border-accent/50")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {hue != null ? (
            <span className="grid size-18 place-items-center rounded-full text-10 font-semibold" style={{ background: `hsl(${hue} 70% 22%)`, color: `hsl(${hue} 80% 70%)` }}>
              {title[0]}
            </span>
          ) : (
            <span className="size-8 rounded-[2px] bg-accent" />
          )}
          <span className="text-11 font-semibold tracking-wide uppercase">{title}</span>
        </div>
        {confirmed ? (
          <Badge tone="success">
            <Check className="size-10" /> confirmed
          </Badge>
        ) : locked ? (
          <Badge tone="accent">
            <Lock className="size-10" /> locked
          </Badge>
        ) : (
          <Badge tone="muted">
            <Unlock className="size-10" /> open
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {items.length === 0 && <p className="rounded-sm border border-dashed border-border px-8 py-12 text-center text-11 text-muted-foreground/60">{emptyHint}</p>}
        {items.map((it) => (
          <ItemRow key={it.key} item={it} editable={editable} onAmount={onAmount} onRemove={onRemove} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-10 tracking-wide text-muted-foreground/70 uppercase">Value</span>
        <span className="tnum text-12 text-accent">{usd(totalUsd)}</span>
      </div>
      {footer}
    </div>
  )
}

function ItemRow({
  item,
  editable,
  onAmount,
  onRemove
}: {
  item: DealItem
  editable: boolean
  onAmount?: (key: string, amt: number) => void
  onRemove?: (key: string) => void
}) {
  const tint = objectTint(item.asset)
  const isNft = item.asset.kind === "nft"
  return (
    <div className="fui-glass flex items-center gap-8 rounded-sm p-8">
      <span className="grid size-24 shrink-0 place-items-center rounded-sm" style={{ background: `${tint}1a`, color: tint, border: `1px solid ${tint}55` }}>
        <ObjectIcon obj={item.asset} className="size-14" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-11 font-medium leading-110">{item.asset.label}</p>
        {editable && !isNft ? (
          <input
            type="number"
            value={item.amount}
            min={0}
            max={item.asset.balance}
            onChange={(e) => onAmount?.(item.key, Math.min(item.asset.balance, Math.max(0, Number(e.target.value))))}
            className="tnum w-full bg-transparent text-11 text-accent outline-none"
          />
        ) : (
          <p className="tnum text-10 text-accent">
            {isNft ? "1 item" : `${units(item.amount)} ${item.asset.symbol}`}
          </p>
        )}
      </div>
      {editable && onRemove && (
        <button onClick={() => onRemove(item.key)} className="grid size-18 place-items-center rounded-sm text-muted-foreground hover:text-danger">
          <X className="size-12" />
        </button>
      )}
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────
function sumUsd(items: DealItem[]) {
  return items.reduce((t, i) => t + (i.asset.kind === "nft" ? i.asset.usd : (i.asset.usd / i.asset.balance) * i.amount), 0)
}
function itemLabel(i: DealItem) {
  return i.asset.kind === "nft" ? i.asset.label : `${units(i.amount)} ${i.asset.symbol}`
}
function buildSummary(direction: string, your: DealItem[], their: DealItem[], to: PersonObj, chain: string) {
  const give = your.map(itemLabel).join(" + ") || "nothing"
  const receive = their.map(itemLabel).join(" + ")
  if (direction === "sending") return `You send ${give} to ${to.label}. ${to.label} must confirm receipt. Settles all-or-nothing on ${chain}.`
  if (direction === "requesting") return `You request ${receive} from ${to.label}, giving nothing. Settles all-or-nothing on ${chain}.`
  return `You send ${give} to ${to.label} and receive ${receive} in return. Settles all-or-nothing on ${chain}.`
}
