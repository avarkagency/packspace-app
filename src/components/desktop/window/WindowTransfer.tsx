"use client"

import { useEffect, useRef, useState } from "react"

import type { AssetObj, PersonObj } from "@/types/objects"
import { ArrowRightLeft, ChevronLeft, Send, ShieldX, TriangleAlert, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"

import { cn, shortAddr, units, usd } from "@/lib/utils"

import { type GiveSlot, type HandoffReceive, WindowHandoff } from "./WindowHandoff"
import { type SendDeal, WindowSend } from "./WindowSend"

// The modal a wallet drop opens — for one asset or several: a multi-select dropped onto a contact
// cascades into this single window rather than a stack of one-asset modals. The desk behind falls out
// of focus rather than under a shade, and the close button floats at the screen's top-right corner.
//
// ONE frame for the whole flow: the glass panel stays mounted and animates its size around whichever
// step is showing — choosing Send grows the height into the confirm layout (Trade will grow the width
// too when its design lands) — so choosing never fades one modal out and another in. Send and Trade
// stay separate components on purpose; this only fronts them.

type Props = {
  assets: AssetObj[]
  inventory: AssetObj[]
  to: PersonObj
  z: number
  onClose: () => void
  onSend: (deals: SendDeal[], to: PersonObj) => void
  onLaunch: (give: GiveSlot[], receive: HandoffReceive[], to: PersonObj) => void
}

type Step = "choose" | "send" | "handoff"

const VERB: Record<Step, string> = { choose: "Transfer", send: "Send", handoff: "Trade" }

/** The panel's width per step. Trade spreads into the two-panel MMO layout; height is measured from
 *  whatever the step renders, so only width needs declaring. */
const WIDTH: Record<Step, number> = { choose: 480, send: 480, handoff: 820 }

export function WindowTransfer({ assets, inventory, to, z, onClose, onSend, onLaunch }: Props) {
  // refs
  const bodyRef = useRef<HTMLDivElement>(null)

  // state
  const [step, setStep] = useState<Step>("choose")
  const [height, setHeight] = useState<number | null>(null)

  // data
  const lead = assets[0]
  const single = assets.length === 1 ? assets[0] : null
  const editable = !!single && single.kind !== "nft"
  const [amount, setAmount] = useState(editable ? single!.balance : 0)
  const what = assets.length > 1 ? `${assets.length}x assets` : editable ? `${units(amount)} ${single!.symbol}` : `${units(lead.balance)} ${lead.symbol}`
  // a compromised recipient blocks the whole flow; retired / unknown warn but let it through
  const blocked = !!to.compromised
  const warn = blocked
    ? "This address is flagged COMPROMISED. Transfers are blocked to protect you — clear the flag first if you're certain."
    : to.retired
      ? "This address is marked Retired and may no longer be monitored. Double-check before sending."
      : to.whitelisted === false
        ? "This address isn't on your whitelist. You've never transacted with it — verify who owns it first."
        : null

  // effects
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [step])

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

      <div
        className="glass panel-in relative overflow-hidden rounded-16 transition-[width,height] duration-300 ease-in-out-quart"
        style={{ width: WIDTH[step], height: height ?? undefined }}>
        {/* keyed so each step's content fades in while the frame stretches around it */}
        <div ref={bodyRef} key={step} className="animate-in fade-in-0 p-28 duration-300">
          {step !== "choose" && (
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="mb-8 flex cursor-pointer items-center gap-4 text-12 leading-120 tracking-tight text-white trans-base hover:text-white/70">
              <ChevronLeft className="size-16" />
              Head back
            </button>
          )}

          <h2 className="flex items-center gap-6 text-18 leading-120 tracking-tight text-white">
            {VERB[step]} {what} to
            <ObjectAvatar contact={to} size={24} />
            {to.label}
          </h2>
          <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
            {to.address ? shortAddr(to.address) : to.handle}
          </span>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          {/* what's on the table — shown on the choose step (and multi-asset sends); a single-asset Send
              carries its amount in the header + confirm panel, so the list would only duplicate it */}
          {step !== "handoff" && !(step === "send" && single) && (
            <ul className="mt-28 flex flex-col gap-8">
              {assets.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-12">
                  <span className="flex min-w-0 items-center gap-12">
                    <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">
                      <ObjectMark obj={a} size={24} />
                    </span>
                    <span className="tnum truncate text-14 leading-120 tracking-tight text-white">
                      {units(a.balance)} {a.symbol}
                    </span>
                  </span>
                  <span className="tnum text-14 leading-120 tracking-tight text-white">{usd(a.usd, { cents: false })}</span>
                </li>
              ))}
            </ul>
          )}

          {step === "choose" && (
            <>
              {warn && (
                <div
                  className={cn(
                    "mt-24 flex items-start gap-8 rounded-md border p-12 text-12 leading-140",
                    blocked ? "border-danger/40 bg-danger/10 text-[#ffcdbf]" : "border-warning/40 bg-warning/10 text-[#f7c86a]"
                  )}>
                  {blocked ? <ShieldX className="mt-px size-16 shrink-0" /> : <TriangleAlert className="mt-px size-16 shrink-0" />}
                  <p>{warn}</p>
                </div>
              )}
              <div className="mt-28 flex gap-8">
                <BaseBtn icon={Send} className="flex-1" disabled={blocked} onClick={() => setStep("send")}>
                  Send assets
                </BaseBtn>
                <BaseBtn variant="secondary" icon={ArrowRightLeft} className="flex-1" disabled={blocked} onClick={() => setStep("handoff")}>
                  Trade assets
                </BaseBtn>
              </div>
            </>
          )}
          {step === "send" && <WindowSend assets={assets} to={to} amount={amount} setAmount={setAmount} onClose={onClose} onSend={onSend} />}
          {step === "handoff" && <WindowHandoff seeds={assets} inventory={inventory} to={to} onClose={onClose} onLaunch={onLaunch} />}
        </div>
      </div>
    </div>
  )
}
