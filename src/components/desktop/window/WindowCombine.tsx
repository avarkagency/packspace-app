"use client"

import type { AssetObj } from "@/types/objects"
import { Combine, Plus } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { units, usd } from "@/lib/utils"

type Props = {
  a: AssetObj
  b: AssetObj
  z: number
  onClose: () => void
  onCombine: () => void
}

export function WindowCombine({ a, b, z, onClose, onCombine }: Props) {
  // data
  const balance = a.balance + b.balance
  const value = a.usd + b.usd

  // events
  const onConfirm = () => {
    onCombine()
    onClose()
  }

  return (
    <WindowShell z={z} width={480} onClose={onClose}>
      <div className="p-28">
        <WindowHeading gap={6} mark={<ObjectMark obj={a} size={24} />} title={`Combine ${units(balance)} ${a.symbol}`} chip={usd(value)} />

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
    </WindowShell>
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
