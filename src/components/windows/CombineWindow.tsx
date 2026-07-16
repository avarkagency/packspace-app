"use client"

import { Plus } from "lucide-react"

import type { AssetObj } from "@/lib/types"
import { units, usd } from "@/lib/utils"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { Button } from "../ui/Bits"
import { Window } from "./Window"

// The inverse of Split: pours two portions of one token back into a single object. Object-level only —
// nothing settles, no chain semantics are implied, the holding is unchanged either way.
//
// Wears Split's panel, because it's Split's other half: same chamfer, same ring, same header shape.

type Props = {
  a: AssetObj
  b: AssetObj
  z: number
  onClose: () => void
  onCombine: () => void
}

export function CombineWindow({ a, b, z, onClose, onCombine }: Props) {
  // data
  const tint = objectTint(a)
  const balance = a.balance + b.balance
  const value = a.usd + b.usd

  // events
  const onConfirm = () => {
    onCombine()
    onClose()
  }

  return (
    <Window
      title="Combine"
      subtitle={`${units(balance)} ${a.symbol}`}
      tint={tint}
      icon={<ObjectMark obj={a} />}
      width={440}
      z={z}
      cut
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-8">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Combine</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-16 p-36">
        <div className="flex items-center gap-10">
          <Portion amount={a.balance} symbol={a.symbol} value={a.usd} />
          <Plus className="size-16 shrink-0 text-muted-foreground" />
          <Portion amount={b.balance} symbol={b.symbol} value={b.usd} />
        </div>

        <div className="rounded-lg border border-accent/40 bg-accent-dim/30 p-14">
          <p className="text-10 tracking-[0.1em] text-accent uppercase">Result</p>
          <p className="tnum mt-8 text-24 font-semibold leading-100">
            {units(balance)} <span className="text-13 font-medium text-muted-foreground">{a.symbol}</span>
          </p>
          <p className="tnum mt-4 text-12 text-accent">{usd(value)}</p>
        </div>
      </div>
    </Window>
  )
}

function Portion({ amount, symbol, value }: { amount: number; symbol: string; value: number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/40 p-12">
      <p className="tnum truncate text-18 font-semibold leading-100">
        {units(amount)} <span className="text-12 font-medium text-muted-foreground">{symbol}</span>
      </p>
      <p className="tnum mt-4 text-11 text-accent">{usd(value)}</p>
    </div>
  )
}
