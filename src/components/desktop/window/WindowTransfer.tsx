"use client"

import { useEffect, useRef, useState } from "react"

import type { AssetObj, PersonObj } from "@/types/objects"
import { ArrowRightLeft, ChevronLeft, Send, ShieldX, TriangleAlert } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cn, shortAddr, units, usd } from "@/lib/utils"

import { type GiveSlot, type HandoffReceive, WindowHandoff } from "./WindowHandoff"
import { type SendDeal, WindowSend } from "./WindowSend"

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
    <WindowShell
      z={z}
      width={WIDTH[step]}
      onClose={onClose}
      cardClassName="transition-[width,height] duration-300 ease-in-out-quart"
      cardStyle={{ height: height ?? undefined }}>
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
    </WindowShell>
  )
}
