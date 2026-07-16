"use client"

import { useState, type CSSProperties } from "react"

import type { AssetObj } from "@/lib/types"
import { cn, units, usd } from "@/lib/utils"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { Button } from "../ui/Bits"
import { Window } from "./Window"

// Asset division — divides one fungible object into two so each can be sent or traded independently.
// Object-level convenience only: nothing settles, no chain semantics are implied, both portions stay in
// the wallet. (Spec: PLANNED, phase placement still open.)

const QUICK = [25, 50, 75]

const roundTo = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

type Props = {
  asset: AssetObj
  z: number
  onClose: () => void
  onSplit: (portion: number) => void
}

export function SplitWindow({ asset, z, onClose, onSplit }: Props) {
  // state — the ratio is Portion A's share, the one drawn on the left. The bar fills from the left too,
  // so it grows with the portion it's pointing at rather than the one opposite it.
  const [pct, setPct] = useState(50)

  // data
  const tint = objectTint(asset)
  // a stack is counted in whole items; everything else divides down to the display precision
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
    <Window
      title="Split"
      subtitle={`${units(asset.balance)} ${asset.symbol}`}
      tint={tint}
      icon={<ObjectMark obj={asset} />}
      width={440}
      z={z}
      cut
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-8">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!valid}>
            Split
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-16 p-36">
        <div className="grid grid-cols-2 gap-10">
          <Portion amount={a} symbol={asset.symbol} value={a * rate} />
          <Portion amount={b} symbol={asset.symbol} value={b * rate} />
        </div>

        <div>
          {/* The fill carries the same caution hatching as the drop zones, but neutral — the stripes and
              the base under them, since the base is what the eye reads as the bar's colour. The handle's 2px ring is the panel's own
              colour, so it reads as a gap rather than a border and the block sits detached in the bar.
              The native input rides on top, invisible: it keeps the keyboard and pointer behaviour that
              a hand-built slider would have to reimplement badly. */}
          <div className="relative h-40">
            <div className="absolute inset-0 border border-border bg-card" />
            <div
              className="fui-zone absolute inset-y-0 left-0"
              style={
                {
                  width: `${pct}%`,
                  "--zone-stripe": "color-mix(in srgb, #ffffff 15%, transparent)",
                  backgroundColor: "color-mix(in srgb, #ffffff 6%, transparent)",
                  borderRight: "1px solid color-mix(in srgb, #ffffff 45%, transparent)"
                } as CSSProperties
              }
              aria-hidden
            />
            <span className="pointer-events-none absolute inset-0 flex items-center px-14 text-11 tracking-[0.1em] text-foreground uppercase">
              Split {pct}%
            </span>
            <span
              className="pointer-events-none absolute inset-y-0 w-14 border-2 border-surface bg-foreground"
              style={{ left: `calc(${pct}% - 7px)` }}
              aria-hidden
            />
            <input
              type="range"
              min={0}
              max={100}
              step={step}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Split ratio"
            />
          </div>

          <div className="mt-14 flex gap-6">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setPct(q)}
                aria-label={`Portion A ${q}%`}
                className={cn(
                  "tnum rounded-sm border px-8 py-4 text-11 trans-base",
                  pct === q ? "border-accent/40 bg-accent-dim text-accent" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {q}/{100 - q}
              </button>
            ))}
          </div>
        </div>

        {!valid && <p className="text-11 text-warning">A split needs something on both sides — nudge the slider.</p>}
      </div>
    </Window>
  )
}

function Portion({ amount, symbol, value }: { amount: number; symbol: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-12">
      <p className="tnum text-18 font-semibold leading-100">
        {units(amount)} <span className="text-12 font-medium text-muted-foreground">{symbol}</span>
      </p>
      <p className="tnum mt-4 text-11 text-accent">{usd(value)}</p>
    </div>
  )
}
