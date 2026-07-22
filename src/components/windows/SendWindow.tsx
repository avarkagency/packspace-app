"use client"

import Image from "next/image"

import { GradientAvatar } from "@outpacelabs/avatars"
import { Send, ShieldCheck, TriangleAlert } from "lucide-react"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"

import { BaseAlert } from "../base/BaseAlert"
import { BaseBtn } from "../base/BaseBtn"
import { chainImage } from "../canvas/objectVisual"

// The Send confirm step — renders inside TransferWindow's frame, below the shared header and asset
// list, so choosing Send stretches the window that's already up rather than fading a second one in.
// The full machine (amount editing, Transaction Interpreter, Safety Engine, type-to-confirm, sign) is
// parked in ./reference/SendWindow.tsx; the button here just closes the flow until that lands.

type Props = {
  /** Everything the drop carried — one asset from a plain drag, several from a multi-select. */
  assets: AssetObj[]
  to: PersonObj
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

/** Fee fixture — nothing here estimates gas yet. */
const FEE = { amount: "0.001 ETH", usd: "$0.08" }

export function SendWindow({ assets, to, onClose, onSettle, onLog }: Props) {
  void assets
  void onSettle // the real machine settles a receipt; this design pass stops at the confirm layout
  void onLog

  // data
  const trusted = to.trust !== "unconfirmed"

  return (
    <>
      {/* the plain facts of the transfer, on their own inset pane */}
      <dl className="glass mt-24 flex flex-col gap-16 rounded-md p-24">
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
              <Image
                src={chainImage(to.chain)}
                alt=""
                width={24}
                height={24}
                unoptimized
                className="size-24 shrink-0 rounded-full border border-white object-cover"
              />
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

      <BaseBtn icon={Send} className="mt-20 w-full" onClick={onClose}>
        Send assets
      </BaseBtn>
    </>
  )
}
