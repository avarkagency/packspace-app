"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { AssetObj, Chain, PersonObj } from "@/types/objects"
import { Check, CloudOff, Loader2, Lock, Plus, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { BaseSlider } from "@/components/base/BaseSlider"
import { ObjectMark } from "@/components/canvas/ObjectMark"

import { canReceive, chainFamily, chainWord, isProjectG } from "@/lib/chain"
import { cn, round4, units } from "@/lib/utils"

// The Handoff (Trade) body — a confirmed, two-sided exchange, rendered inside TransferWindow's frame.
// It's LIVE: first a connection handshake reaches the counterparty (Project G wallets are always
// reachable; an external address must be online), then the MMO-style window opens — an inventory rail
// and two 3×3 trays ("You give" / "{name} gives"). Both sides Lock, a short review holds the exact
// terms, then both Confirm and the deal launches atomically. The counterparty is timer-simulated.
// Chain rules: an external single-chain address can only take assets of its own family; a mixed bundle
// needs a Project G wallet.

/** What the counterparty hands back on launch — not an owned asset until it settles. */
export type HandoffReceive = { label: string; symbol: string; amount: number; usd: number; color: string; chain: Chain }

type Props = {
  /** Everything the drop carried — the trade opens seeded with all of it in "You give". */
  seeds: AssetObj[]
  /** The live holdings, for the inventory rail. */
  inventory: AssetObj[]
  to: PersonObj
  onClose: () => void
  onLaunch: (give: GiveSlot[], receive: HandoffReceive[], to: PersonObj) => void
}

/** One placed offer in the "You give" tray. */
export type GiveSlot = { key: string; asset: AssetObj; amount: number }

/** Counterparty sim timings (spec §3.5.2), verbatim from the prototype. */
const T_LOCK = 950
const T_REVIEW = 2200
const T_CONFIRM = 950
const T_SETTLE = 1300
const T_CONNECT = 1700

/** What the other side offers when you request something back — a flat 500 USDC, per the prototype. */
const REQUEST_BACK: HandoffReceive = { label: "USD Coin", symbol: "USDC", amount: 500, usd: 500, color: "#2775ca", chain: "Base" }

type Phase = "connecting" | "failed" | "active" | "settled"

export function HandoffWindow({ seeds, inventory, to, onClose, onLaunch }: Props) {
  // refs — every simulated counterparty step is a timer; they all clear on edit and on unmount
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // state
  const [phase, setPhase] = useState<Phase>("connecting")
  const [give, setGive] = useState<GiveSlot[]>(() => seeds.filter((s) => s.kind === "nft").map((s) => ({ key: s.id, asset: s, amount: 1 })))
  const [requesting, setRequesting] = useState(false)
  const [youLocked, setYouLocked] = useState(false)
  const [themLocked, setThemLocked] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [youConfirmed, setYouConfirmed] = useState(false)
  const [themConfirmed, setThemConfirmed] = useState(false)
  const [place, setPlace] = useState<{ asset: AssetObj; amount: number } | null>(null)
  const [issue, setIssue] = useState<string | null>(null)

  // data
  const reachable = isProjectG(to) || to.online === true
  const receive = requesting ? [REQUEST_BACK] : []
  const bothLocked = youLocked && themLocked
  const reviewing = bothLocked && !reviewDone
  const settling = youConfirmed && themConfirmed
  const editable = !youLocked && phase === "active"
  const placedOf = (id: string) => give.filter((g) => g.asset.id === id).reduce((t, g) => t + g.amount, 0)

  // the inventory: your holdings on this side, minus what's fully placed, with incompatibility flagged
  const rail = useMemo(
    () => inventory.filter((a) => a.kind === "nft" || a.balance - placedOf(a.id) > 0),
    [inventory, give] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // events — any change to the terms breaks both locks (the deal is no longer the one they saw)
  const resetNegotiation = () => {
    clearTimers()
    setYouLocked(false)
    setThemLocked(false)
    setReviewDone(false)
    setYouConfirmed(false)
    setThemConfirmed(false)
    setIssue(null)
  }

  const addAsset = (asset: AssetObj) => {
    if (!editable) return
    if (!canReceive(asset, to)) {
      setIssue(
        `${asset.label} (${asset.chain ?? "Base"}) can't be part of a Handoff with ${to.label} — it's a ${chainWord(to.chain)}-only address. Use a Project G wallet for a mixed bundle.`
      )
      return
    }
    resetNegotiation()
    if (asset.kind === "nft") {
      if (give.some((g) => g.asset.id === asset.id)) return
      setGive((g) => [...g, { key: asset.id, asset, amount: 1 }])
    } else {
      setPlace({ asset, amount: round4(asset.balance - placedOf(asset.id)) })
    }
  }
  const confirmPlace = () => {
    if (!place || place.amount <= 0) return
    resetNegotiation()
    setGive((g) => [...g, { key: `${place.asset.id}-${g.length}`, asset: place.asset, amount: place.amount }])
    setPlace(null)
  }
  const removeSlot = (key: string) => {
    resetNegotiation()
    setGive((g) => g.filter((s) => s.key !== key))
  }
  const toggleRequest = () => {
    resetNegotiation()
    setRequesting((v) => !v)
  }

  // the lock/confirm actions
  const lockIssue = (): string | null => {
    if (isProjectG(to)) return null
    const fams = new Set(give.map((g) => chainFamily(g.asset.chain)))
    const target = chainFamily(to.chain)
    if ([...fams].some((f) => f !== target))
      return `${to.label} is a ${chainWord(to.chain)}-only address — a Handoff with it can only include ${chainWord(to.chain)} assets. Use a Project G wallet for a mixed bundle.`
    return null
  }
  const lockYou = () => {
    const bad = lockIssue()
    if (bad) return setIssue(bad)
    if (!give.length && !receive.length) return
    setIssue(null)
    setYouLocked(true)
  }
  const unlockYou = () => resetNegotiation()
  const confirmYou = () => {
    if (!reviewDone) return
    setYouConfirmed(true)
  }
  const cancel = () => {
    clearTimers()
    onClose()
  }

  // effects — connection handshake: reach the counterparty, then open (or fail)
  useEffect(() => {
    const t = setTimeout(() => setPhase(reachable ? "active" : "failed"), T_CONNECT)
    return () => clearTimeout(t)
  }, [reachable])

  // effects — counterparty simulation. Each stage arms the next; editing resets the flags, which unwinds
  // these cleanly through their cleanups.
  useEffect(() => {
    if (phase !== "active" || !youLocked || themLocked) return
    const t = setTimeout(() => setThemLocked(true), T_LOCK)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [phase, youLocked, themLocked])

  useEffect(() => {
    if (!bothLocked || reviewDone) return
    const t = setTimeout(() => setReviewDone(true), T_REVIEW)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [bothLocked, reviewDone])

  useEffect(() => {
    if (!youConfirmed || themConfirmed) return
    const t = setTimeout(() => setThemConfirmed(true), T_CONFIRM)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [youConfirmed, themConfirmed])

  useEffect(() => {
    if (!youConfirmed || !themConfirmed || phase !== "active") return
    const t = setTimeout(() => {
      setPhase("settled")
      onLaunch(give, receive, to)
      onClose()
    }, T_SETTLE)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [youConfirmed, themConfirmed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimers(), [])

  // ── connection handshake ─────────────────────────────────────────────────────
  if (phase === "connecting")
    return (
      <div className="mt-24 flex flex-col items-center gap-16 py-24 text-center">
        <span
          className="size-44 rounded-full border-[3px] border-[#c4b6ff]/25 border-t-[#c4b6ff]"
          style={{ animation: "hospin 0.8s linear infinite" }}
          aria-hidden
        />
        <div>
          <p className="text-16 leading-120 font-medium text-white">Reaching {to.label}…</p>
          <p className="mx-auto mt-8 max-w-320 text-12 leading-140 text-white/60">
            A Handoff is a live exchange — it needs both wallets connected to PackSpace. Waiting for them to join the session…
          </p>
        </div>
        <BaseBtn variant="secondary" onClick={cancel}>
          Cancel
        </BaseBtn>
      </div>
    )

  if (phase === "failed")
    return (
      <div className="mt-24 flex flex-col items-center gap-16 py-24 text-center">
        <CloudOff className="size-40 text-[#ff8a6a]" />
        <div>
          <p className="text-16 leading-120 font-medium text-white">Couldn&apos;t reach {to.label}</p>
          <p className="mx-auto mt-8 max-w-320 text-12 leading-140 text-white/60">
            They&apos;re not in PackSpace right now. A Handoff needs both sides connected, so the request was cancelled. You can still send one-way.
          </p>
        </div>
        <BaseBtn variant="secondary" onClick={onClose}>
          Close
        </BaseBtn>
      </div>
    )

  // ── the trade window ─────────────────────────────────────────────────────────
  const youStatus = youConfirmed ? "Confirmed" : youLocked ? "Locked" : "Editing"
  const themStatus = themConfirmed ? "Confirmed" : themLocked ? "Locked" : requesting ? "Offering" : "Idle"
  const note = settling
    ? `Both confirmed — launching atomic settlement on ${give[0]?.asset.chain ?? "Base"}.`
    : youConfirmed && !themConfirmed
      ? `Waiting for ${to.label} to confirm…`
      : reviewDone
        ? "Locked in — Confirm on both sides to settle."
        : bothLocked
          ? "Both locked — final review…"
          : youLocked
            ? `Waiting for ${to.label} to lock…`
            : "Both sides Lock, then Confirm, to settle."

  return (
    <div className="mt-24 flex flex-col gap-14">
      <div className="flex gap-14">
        {/* inventory rail */}
        <div className="flex w-160 shrink-0 flex-col gap-8">
          <p className="text-10 font-semibold tracking-wide text-white/45 uppercase">Your assets — tap to offer</p>
          {/* the list fades out over its last 56px; the extra bottom padding keeps the final item clear
              of the fade when scrolled all the way down */}
          <div
            className="no-scrollbar flex max-h-320 flex-col gap-6 overflow-auto pr-2 pb-56"
            style={{
              maskImage: "linear-gradient(to bottom, #000 calc(100% - 56px), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 56px), transparent)"
            }}>
            {rail.map((a) => {
              const incompat = !canReceive(a, to)
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!editable || incompat}
                  onClick={() => addAsset(a)}
                  className={cn(
                    "glass flex items-center gap-8 rounded-md p-8 text-left trans-base hover:bg-white/10 disabled:pointer-events-none",
                    incompat ? "opacity-30 grayscale" : !editable && "opacity-40"
                  )}>
                  <ObjectMark obj={a} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-12 leading-120 font-medium text-white">{a.label}</span>
                    <span className="tnum block text-10 leading-120 text-white/50">{a.kind === "nft" ? "1 of 1" : units(a.balance - placedOf(a.id))}</span>
                  </span>
                </button>
              )
            })}
            {rail.length === 0 && <p className="text-11 text-white/40">Nothing left to offer.</p>}
          </div>
        </div>

        {/* the two trays */}
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-10">
          <Tray
            title="You give"
            status={youStatus}
            slots={give.map((g) => ({ key: g.key, asset: g.asset, amount: g.amount }))}
            editable={editable}
            onRemove={removeSlot}
          />
          <Tray
            title={`${to.label} gives`}
            status={themStatus}
            slots={receive.map((r, i) => ({ key: `r${i}`, receive: r }))}
            editable={false}
            dim={!themConfirmed}
          />
        </div>
      </div>

      {/* request-back toggle */}
      <button
        type="button"
        disabled={!editable}
        onClick={toggleRequest}
        className="glass self-start rounded-full px-12 py-6 text-12 leading-120 text-[#d8ceff] trans-base hover:bg-white/10 disabled:opacity-40">
        {requesting ? "Cancel request" : "+ Request something back"}
      </button>

      {issue && <p className="rounded-md border border-danger/40 bg-danger/10 p-10 text-12 leading-140 text-[#ffcdbf]">{issue}</p>}

      {/* action row */}
      <div className="flex items-center gap-8">
        {settling ? (
          <div className="flex flex-1 items-center justify-center gap-8 py-8 text-13 text-[#c4b6ff]">
            <Loader2 className="size-16 animate-spin" /> Launching — atomic settlement…
          </div>
        ) : youConfirmed ? (
          <div className="flex flex-1 items-center justify-center gap-8 py-8 text-13 text-white/60">
            <Loader2 className="size-16 animate-spin" /> Waiting for {to.label} to confirm…
          </div>
        ) : reviewDone ? (
          <BaseBtn icon={Check} className="flex-1" onClick={confirmYou}>
            Confirm
          </BaseBtn>
        ) : reviewing ? (
          <BaseBtn className="flex-1" disabled>
            <Loader2 className="size-16 animate-spin" /> Final review…
          </BaseBtn>
        ) : youLocked ? (
          <>
            <BaseBtn className="flex-1" disabled>
              <Loader2 className="size-16 animate-spin" /> Waiting for {to.label} to lock…
            </BaseBtn>
            <BaseBtn variant="secondary" onClick={unlockYou}>
              Unlock &amp; edit
            </BaseBtn>
          </>
        ) : (
          <BaseBtn icon={Lock} className="flex-1" disabled={!give.length && !receive.length} onClick={lockYou}>
            Lock in offer
          </BaseBtn>
        )}
      </div>

      <p className="text-center text-12 leading-140 text-white/55">{note}</p>

      {/* place-amount picker */}
      {place && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-16 bg-black/40 p-16" onClick={() => setPlace(null)}>
          <div className="glass w-320 rounded-16 p-20" onClick={(e) => e.stopPropagation()}>
            <p className="text-14 leading-120 font-medium text-white">Add {place.asset.label}</p>
            <div className="glass mt-16 flex items-baseline gap-8 rounded-md px-12 py-10">
              <input
                type="number"
                value={place.amount}
                min={0}
                max={place.asset.balance}
                onChange={(e) => setPlace((p) => (p ? { ...p, amount: round4(Math.min(place.asset.balance, Math.max(0, Number(e.target.value)))) } : p))}
                className="tnum w-full bg-transparent text-20 font-light text-white outline-none"
                aria-label="Amount"
              />
              <span className="tnum text-12 text-white/60">{place.asset.symbol}</span>
              <button
                type="button"
                onClick={() => setPlace((p) => (p ? { ...p, amount: round4(place.asset.balance - placedOf(place.asset.id)) } : p))}
                className="shrink-0 rounded-full border border-white/20 bg-white/10 px-10 py-4 text-11 font-bold text-white trans-base hover:bg-white/20">
                ALL
              </button>
            </div>
            <div className="mt-12">
              <BaseSlider
                max={place.asset.balance}
                step={place.asset.balance / 100}
                value={place.amount}
                onChange={(v) => setPlace((p) => (p ? { ...p, amount: round4(Math.min(place.asset.balance, Math.max(0, v))) } : p))}
                label={`${units(place.amount)} ${place.asset.symbol}`}
                ariaLabel="Amount"
              />
            </div>
            <div className="mt-16 flex gap-8">
              <BaseBtn variant="secondary" className="flex-1" onClick={() => setPlace(null)}>
                Cancel
              </BaseBtn>
              <BaseBtn icon={Plus} className="flex-1" disabled={place.amount <= 0} onClick={confirmPlace}>
                Add to offer
              </BaseBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── a single tray: 3×3 of placed offers ─────────────────────────────────────────
type Cell = { key: string } & ({ asset: AssetObj; amount: number } | { receive: HandoffReceive })

function Tray({
  title,
  status,
  slots,
  editable,
  onRemove,
  dim = false
}: {
  title: string
  status: string
  slots: Cell[]
  editable: boolean
  onRemove?: (key: string) => void
  dim?: boolean
}) {
  const statusColor = status === "Confirmed" ? "#3ddc84" : status === "Locked" ? "#f7c86a" : "rgba(255,255,255,0.5)"
  return (
    <div className="glass flex min-w-0 flex-col rounded-md">
      <div className="flex items-center justify-between border-b border-white/10 px-12 py-8">
        <span className="truncate text-12 leading-120 font-semibold text-white">{title}</span>
        <span className="text-11 leading-120 font-bold" style={{ color: statusColor }}>
          {status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-6 p-10">
        {Array.from({ length: 9 }).map((_, i) => {
          const cell = slots[i]
          if (!cell) return <div key={i} className="h-64 rounded-md border border-dashed border-white/12" aria-hidden />
          const isReceive = "receive" in cell
          return (
            <div
              key={cell.key}
              className={cn("relative grid h-64 place-items-center gap-2 rounded-md border border-white/10 bg-white/5 p-4", dim && "opacity-40 grayscale")}>
              {isReceive ? (
                <span className="grid size-32 place-items-center rounded-full text-14 font-bold text-white" style={{ background: cell.receive.color }}>
                  $
                </span>
              ) : (
                <ObjectMark obj={cell.asset} size={32} />
              )}
              <span className="tnum text-9 leading-100 text-white/70">
                {isReceive
                  ? `${units(cell.receive.amount)} ${cell.receive.symbol}`
                  : cell.asset.kind === "nft"
                    ? "1 of 1"
                    : `${units(cell.amount)} ${cell.asset.symbol}`}
              </span>
              {editable && onRemove && !isReceive && (
                <button
                  type="button"
                  onClick={() => onRemove(cell.key)}
                  aria-label="Remove"
                  className="absolute top-2 right-2 grid size-16 place-items-center rounded-4 bg-black/40 text-white/80 trans-base hover:text-white">
                  <X className="size-10" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
