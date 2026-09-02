"use client"

import type { AssetObj } from "@/types/objects"
import { Combine, Plus, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectMark } from "@/components/canvas/ObjectMark"

import { units, usd } from "@/lib/utils"

// The inverse of Split: pours two portions of one token back into a single object. Object-level only —
// nothing settles, no chain semantics are implied, the holding is unchanged either way.
//
// Wears Split's glass frame, because it's Split's other half: same blurred desk, same floating close,
// same header shape and inset panes.

type Props = {
  a: AssetObj
  b: AssetObj
  z: number
  onClose: () => void
  onCombine: () => void
}

export function CombineWindow({ a, b, z, onClose, onCombine }: Props) {
  // data
  const balance = a.balance + b.balance
  const value = a.usd + b.usd

  // events
  const onConfirm = () => {
    onCombine()
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
              <ObjectMark obj={a} size={24} />
            </span>
            Combine {units(balance)} {a.symbol}
          </h2>
          <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{usd(value)}</span>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          {/* the two portions being poured together */}
          <div className="mt-28 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
            <Portion amount={a.balance} symbol={a.symbol} value={a.usd} />
            <Plus className="size-16 shrink-0 text-white/70" />
            <Portion amount={b.balance} symbol={b.symbol} value={b.usd} />
          </div>

          <div className="glass mt-8 rounded-md p-16">
            <p className="text-11 leading-120 font-medium text-white/70">Result</p>
            <p className="tnum mt-8 text-24 font-semibold leading-100 text-white">
              {units(balance)} <span className="text-12 font-medium text-white/70">{a.symbol}</span>
            </p>
            <p className="tnum mt-4 text-11 leading-120 text-white/70">{usd(value)}</p>
          </div>

          <BaseBtn icon={Combine} className="mt-28 w-full" onClick={onConfirm}>
            Combine assets
          </BaseBtn>
        </div>
      </div>
    </div>
  )
}

function Portion({ amount, symbol, value }: { amount: number; symbol: string; value: number }) {
  return (
    <div className="glass min-w-0 rounded-md p-16">
      <p className="tnum truncate text-18 font-semibold leading-100 text-white">
        {units(amount)} <span className="text-12 font-medium text-white/70">{symbol}</span>
      </p>
      <p className="tnum mt-4 text-11 leading-120 text-white/70">{usd(value)}</p>
    </div>
  )
}
