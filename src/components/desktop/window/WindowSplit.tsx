"use client"

import { useState } from "react"

import type { AssetObj } from "@/types/objects"
import { Scissors } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { BaseSlider } from "@/components/base/BaseSlider"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cn, units, usd } from "@/lib/utils"

const QUICK = [25, 50, 75]

const roundTo = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

type Props = {
  asset: AssetObj
  z: number
  onClose: () => void
  onSplit: (portion: number) => void
}

export function WindowSplit({ asset, z, onClose, onSplit }: Props) {
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
    <WindowShell z={z} width={480} onClose={onClose}>
      <div className="p-28">
        <WindowHeading gap={6} mark={<ObjectMark obj={asset} size={24} />} title={`Split ${units(asset.balance)} ${asset.symbol}`} chip={usd(asset.usd)} />

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
    </WindowShell>
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
