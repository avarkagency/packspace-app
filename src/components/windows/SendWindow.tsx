"use client"

import Image from "next/image"
import { useState } from "react"

import { GradientAvatar } from "@outpacelabs/avatars"
import { Ban, ChevronLeft, Send, ShieldCheck, TriangleAlert } from "lucide-react"

import { blockSendMessage, canReceive, chainWord } from "@/lib/chain"
import type { AssetObj, PersonObj } from "@/lib/types"
import { round4, units, usd } from "@/lib/utils"

import { BaseAlert } from "../base/BaseAlert"
import { BaseBtn } from "../base/BaseBtn"
import { BaseSlider } from "../base/BaseSlider"
import { chainImage } from "../canvas/objectVisual"

// The Send confirm step — renders inside TransferWindow's frame, below the shared header and asset list.
// A one-way give: an amount stage (fungibles only) then the confirm screen. Confirm deducts the balance
// and settles a receipt. NFTs and multi-asset drops skip the amount stage and send in full.

/** One asset leaving, with the quantity to send. */
export type SendDeal = { asset: AssetObj; amount: number }

type Props = {
  /** Everything the drop carried — one asset from a plain drag, several from a multi-select. */
  assets: AssetObj[]
  to: PersonObj
  /** The amount to send, owned by TransferWindow so its header stays in step with the confirm panel. */
  amount: number
  setAmount: (v: number) => void
  onClose: () => void
  onSend: (deals: SendDeal[], to: PersonObj) => void
}

/** Fee fixture — nothing here estimates gas yet. */
const FEE = { amount: "0.001 ETH", usd: "$0.08" }

export function SendWindow({ assets, to, amount, setAmount, onClose, onSend }: Props) {
  // data — a lone fungible token can have its amount edited; NFTs and multi-asset drops send in full
  const single = assets.length === 1 ? assets[0] : null
  const editable = !!single && single.kind !== "nft"

  // state
  const [stage, setStage] = useState<"amount" | "confirm">(editable ? "amount" : "confirm")

  // data — chain compatibility: an external single-chain address can't receive the wrong family
  const incompatible = assets.find((a) => !canReceive(a, to))
  const trusted = to.trust !== "unconfirmed"
  const setAmt = (v: number) => setAmount(round4(Math.min(single!.balance, Math.max(0, v))))
  const amountLabel = single ? (single.kind === "nft" ? single.label : `${units(amount)} ${single.symbol}`) : `${assets.length} assets`

  // events
  const confirmSend = () => {
    if (incompatible) return
    const deals: SendDeal[] = editable ? [{ asset: single!, amount }] : assets.map((a) => ({ asset: a, amount: a.kind === "nft" ? 1 : a.balance }))
    onSend(deals, to)
    onClose()
  }

  // a wrong-chain send is blocked outright — no bridging (Phase 2)
  if (incompatible)
    return (
      <div className="mt-24 flex flex-col gap-8 rounded-md border border-danger/40 bg-danger/10 p-16">
        <div className="flex items-center gap-8 text-danger">
          <Ban className="size-16 shrink-0" />
          <span className="text-14 font-medium leading-120">{chainWord(to.chain)}-only address</span>
        </div>
        <p className="text-12 leading-140 text-white/70">{blockSendMessage(incompatible, to)}</p>
        <BaseBtn variant="secondary" className="mt-8 w-full" onClick={onClose}>
          Close
        </BaseBtn>
      </div>
    )

  // amount stage — a lone fungible token, its quantity editable before the confirm
  if (stage === "amount" && single)
    return (
      <div className="mt-24 flex flex-col gap-16">
        <div className="glass flex items-baseline gap-8 rounded-md px-16 py-12">
          <input
            type="number"
            value={amount}
            min={0}
            max={single.balance}
            onChange={(e) => setAmt(Number(e.target.value))}
            className="tnum w-full bg-transparent text-24 font-light text-white outline-none"
            aria-label="Amount"
          />
          <span className="tnum text-14 text-white/60">{single.symbol}</span>
          <button
            type="button"
            onClick={() => setAmt(single.balance)}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-12 py-6 text-12 font-bold text-white trans-base hover:bg-white/20">
            ALL
          </button>
        </div>
        <BaseSlider max={single.balance} step={single.balance / 100} value={amount} onChange={setAmt} label={`${units(amount)} ${single.symbol}`} ariaLabel="Amount" />
        <div className="flex justify-between text-12 text-white/50">
          <span className="tnum">
            Balance {units(single.balance)} {single.symbol}
          </span>
          <span className="tnum">{usd((single.usd / single.balance) * amount, { cents: false })}</span>
        </div>
        <BaseBtn className="mt-4 w-full" disabled={amount <= 0} onClick={() => setStage("confirm")}>
          Continue
        </BaseBtn>
      </div>
    )

  // confirm stage — the plain facts of the transfer
  return (
    <div className="mt-24">
      {editable && (
        <button
          type="button"
          onClick={() => setStage("amount")}
          className="mb-16 flex items-center gap-4 text-12 leading-120 tracking-tight text-white trans-base hover:text-white/70">
          <ChevronLeft className="size-16" />
          Change amount
        </button>
      )}

      <dl className="glass flex flex-col gap-16 rounded-md p-24">
        <div className="flex items-baseline justify-between gap-12">
          <dt className="text-14 leading-120 tracking-tight text-white/80">You send</dt>
          <dd className="tnum text-16 leading-120 tracking-tight text-white">{amountLabel}</dd>
        </div>

        <div className="-mx-24 h-px bg-white/15" aria-hidden />

        <div className="flex items-center justify-between gap-12">
          <dt className="text-14 leading-120 tracking-tight text-white/80">Recipient</dt>
          <dd className="flex min-w-0 items-center gap-6 text-14 leading-120 tracking-tight text-white">
            <GradientAvatar seed={to.address ?? to.id} size={24} className="shrink-0" />
            <span className="truncate">{to.label}</span>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-12">
          <dt className="text-14 leading-120 tracking-tight text-white/80">Network</dt>
          <dd className="flex items-center gap-6 text-14 leading-120 tracking-tight text-white">
            {to.chain && (
              <Image src={chainImage(to.chain)} alt="" width={24} height={24} unoptimized className="size-24 shrink-0 rounded-full border border-white object-cover" />
            )}
            {to.chain ?? "—"}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-12">
          <dt className="text-14 leading-120 tracking-tight text-white/80">Transaction fee</dt>
          <dd className="flex flex-col items-end gap-2">
            <span className="tnum text-14 leading-120 tracking-tight text-white">{FEE.amount}</span>
            <span className="tnum text-12 leading-120 text-white/70">{FEE.usd}</span>
          </dd>
        </div>
      </dl>

      <BaseAlert className="mt-8" variant={trusted ? "positive" : "warning"} icon={trusted ? ShieldCheck : TriangleAlert}>
        {trusted ? "Recipient is a trusted contact" : "Recipient is not in your contacts"}
      </BaseAlert>

      <BaseBtn icon={Send} className="mt-20 w-full" onClick={confirmSend}>
        Send assets
      </BaseBtn>
    </div>
  )
}
