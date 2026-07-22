"use client"

import { useState } from "react"

import { Scissors, X } from "lucide-react"

import type { AssetObj } from "@/lib/types"
import { cn, units, usd } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { BaseSlider } from "../base/BaseSlider"
import { ObjectMark } from "../canvas/ObjectMark"

// Asset division — divides one fungible object into two so each can be sent or traded independently.
// Object-level convenience only: nothing settles, no chain semantics are implied, both portions stay in
// the wallet. (Spec: PLANNED, phase placement still open.)
//
// Wears the same glass frame as the Send/Trade flow: blurred desk, floating close, one panel. The
// chrome stays white like its siblings; the split's yellow signal lives on the desk, where the fresh
// halves flash once the split lands.

const QUICK = [25, 50, 75]

const roundTo = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

type Props = {
  asset: AssetObj
  z: number
  onClose: () => void
  onSplit: (portion: number) => void
}

export function SplitWindow({ asset, z, onClose, onSplit }: Props) {
  // state
  const [pct, setPct] = useState(50)

  // data
  const dp = asset.kind === "stack" ? 0 : 4
  const step = asset.kind === "stack" ? 100 / asset.balance : 1
  const a = roundTo((asset.balance * pct) / 100, dp)
  const b = roundTo(asset.balance - a, dp)
  const rate = asset.usd / asset.balance
  const valid = a > 0 && b > 0

  // events
  const onConfirm = () => {
    if (!valid) return
    onSplit(b)
    onClose()
  }

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

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 480 }}>
        <div className="p-28">
          <h2 className="flex items-center gap-6 text-18 leading-120 tracking-tight text-white">
            <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">
              <ObjectMark obj={asset} size={24} />
            </span>
            Split {units(asset.balance)} {asset.symbol}
          </h2>
          <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
            {usd(asset.usd)}
          </span>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          {/* the two portions the slider carves */}
          <div className="mt-28 grid grid-cols-2 gap-8">
            <Portion amount={a} symbol={asset.symbol} value={a * rate} />
            <Portion amount={b} symbol={asset.symbol} value={b * rate} />
          </div>

          <div className="mt-8">
            <BaseSlider min={0} max={100} step={step} value={pct} onChange={setPct} label={`Split ${pct}%`} ariaLabel="Split ratio" />
          </div>

          <div className="mt-8 flex gap-6">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setPct(q)}
                aria-label={`Portion A ${q}%`}
                className={cn(
                  "tnum cursor-pointer rounded-full border border-white/20 px-10 py-4 text-11 leading-120 trans-base active:scale-97",
                  pct === q ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:text-white"
                )}>
                {q}/{100 - q}
              </button>
            ))}
          </div>

          {!valid && <p className="mt-8 text-11 leading-120 text-warning">A split needs something on both sides — nudge the slider.</p>}

          <BaseBtn icon={Scissors} className="mt-28 w-full" disabled={!valid} onClick={onConfirm}>
            Split asset
          </BaseBtn>
        </div>
      </div>
    </div>
  )
}

function Portion({ amount, symbol, value }: { amount: number; symbol: string; value: number }) {
  return (
    <div className="glass rounded-md p-16">
      <p className="tnum text-18 font-semibold leading-100 text-white">
        {units(amount)} <span className="text-12 font-medium text-white/70">{symbol}</span>
      </p>
      <p className="tnum mt-4 text-11 leading-120 text-white/70">{usd(value)}</p>
    </div>
  )
}
