"use client"

import { useLayoutEffect, useRef, useState } from "react"

import { GradientAvatar } from "@outpacelabs/avatars"
import { ArrowRightLeft, ChevronLeft, Send, X } from "lucide-react"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"
import { shortAddr, units, usd } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { ObjectMark } from "../canvas/ObjectMark"
import { HandoffWindow } from "./HandoffWindow"
import { SendWindow } from "./SendWindow"

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
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

type Step = "choose" | "send" | "handoff"

const VERB: Record<Step, string> = { choose: "Transfer", send: "Send", handoff: "Trade" }

/** The panel's width per step. Trade spreads out when its design lands; the height is measured from
 *  whatever the step renders, so only width needs declaring. */
const WIDTH: Record<Step, number> = { choose: 480, send: 480, handoff: 560 }

export function TransferWindow({ assets, to, z, onClose, onSettle, onLog }: Props) {
  // refs
  const bodyRef = useRef<HTMLDivElement>(null)

  // state
  const [step, setStep] = useState<Step>("choose")
  const [height, setHeight] = useState<number | null>(null)

  // data
  const lead = assets[0]
  const what = assets.length > 1 ? `${assets.length}x assets` : `${units(lead.balance)} ${lead.symbol}`

  // effects — the frame animates to wrap whichever step is showing; the body is measured, never sized
  useLayoutEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.offsetHeight)
  }, [step, assets.length])

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
            <GradientAvatar seed={to.address ?? to.id} size={24} className="shrink-0" />
            {to.label}
          </h2>
          <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
            {to.address ? shortAddr(to.address) : to.handle}
          </span>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          {/* what's on the table — every step shows the same list */}
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

          {step === "choose" && (
            <div className="mt-28 flex gap-8">
              <BaseBtn icon={Send} className="flex-1" onClick={() => setStep("send")}>
                Send assets
              </BaseBtn>
              <BaseBtn variant="secondary" icon={ArrowRightLeft} className="flex-1" onClick={() => setStep("handoff")}>
                Trade assets
              </BaseBtn>
            </div>
          )}
          {step === "send" && <SendWindow assets={assets} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />}
          {step === "handoff" && <HandoffWindow seeds={assets} to={to} onClose={onClose} onSettle={onSettle} onLog={onLog} />}
        </div>
      </div>
    </div>
  )
}
