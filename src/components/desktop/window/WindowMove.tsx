"use client"

import Image from "next/image"
import { useState } from "react"

import type { AssetObj } from "@/types/objects"
import { ArrowRight, WalletCards } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { BaseSlider } from "@/components/base/BaseSlider"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cn, units, usd } from "@/lib/utils"
import { WALLETS, type Wallet } from "@/lib/wallets"

type Props = {
  asset: AssetObj
  from: Wallet
  to: Wallet
  existing: AssetObj | null
  z: number
  onClose: () => void
  onMove: (amount: number, mergeIntoId: string | null) => void
}

export function WindowMove({ asset, from, to, existing, z, onClose, onMove }: Props) {
  // data
  const divisible = asset.kind !== "nft" && asset.balance > 0
  const max = asset.balance

  // state
  const [amount, setAmount] = useState(max)
  const [merge, setMerge] = useState(true)

  // data
  const rate = asset.balance > 0 ? asset.usd / asset.balance : 0
  const step = asset.kind === "stack" ? 1 : max / 100
  const valid = !divisible || amount > 0
  const willMerge = !!existing && merge && divisible

  // events
  const onConfirm = () => {
    if (!valid) return
    onMove(divisible ? amount : max, willMerge ? existing.id : null)
    onClose()
  }

  return (
    <WindowShell z={z} width={480} onClose={onClose}>
      <div className="p-28">
        <WindowHeading gap={6} mark={<ObjectMark obj={asset} size={24} />} title={`Move ${asset.label}`}>
          {/* which wallet to which — the whole point of the window */}
          <div className="mt-12 flex items-center gap-8 text-12 leading-120">
            <span className="flex items-center gap-6 rounded-full bg-white/10 px-10 py-4 text-white">
              <Image src={WALLETS[from].image} alt="" width={14} height={14} unoptimized className="size-14 shrink-0" />
              {WALLETS[from].label}
            </span>
            <ArrowRight className="size-12 shrink-0 text-white/50" aria-hidden />
            <span className="flex items-center gap-6 rounded-full bg-white/10 px-10 py-4 text-white">
              <Image src={WALLETS[to].image} alt="" width={14} height={14} unoptimized className="size-14 shrink-0" />
              {WALLETS[to].label}
            </span>
          </div>
        </WindowHeading>

        {divisible ? (
          <>
            <div className="mt-28 flex items-end justify-between gap-12">
              <div>
                <p className="tnum text-28 font-light leading-100 text-white">
                  {units(amount)} <span className="text-14 font-medium text-white/70">{asset.symbol}</span>
                </p>
                <p className="tnum mt-6 text-11 leading-120 text-white/70">{usd(amount * rate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setAmount(max)}
                className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-10 py-4 text-11 leading-120 text-white/70 trans-base hover:text-white active:scale-97">
                All
              </button>
            </div>

            <div className="mt-16">
              <BaseSlider min={0} max={max} step={step} value={amount} onChange={setAmount} label={`Of ${units(max)} held`} ariaLabel="Amount to move" />
            </div>

            {!valid && <p className="mt-8 text-11 leading-120 text-warning">Nudge the slider — a move of nothing does nothing.</p>}
          </>
        ) : (
          <p className="mt-28 text-13 leading-140 text-white/70">{asset.label} is a one-of-one, so it moves across whole.</p>
        )}

        {existing && divisible && (
          <label className="mt-20 flex cursor-pointer items-start gap-10 rounded-md border border-white/10 bg-white/5 p-12">
            <input
              type="checkbox"
              checked={merge}
              onChange={(e) => setMerge(e.target.checked)}
              className="mt-2 size-12 shrink-0 accent-white"
              aria-label={`Pool into your existing ${existing.symbol}`}
            />
            <span className="min-w-0">
              <span className="block text-12 leading-120 text-white">
                Pool into your existing {units(existing.balance)} {existing.symbol}
              </span>
              <span className="tnum mt-4 block text-11 leading-120 text-white/60">
                {WALLETS[to].label} already holds this token — pooled it lands as one object of {units(existing.balance + amount)} {existing.symbol}.
              </span>
            </span>
          </label>
        )}

        <BaseBtn icon={WalletCards} className={cn("mt-28 w-full")} disabled={!valid} onClick={onConfirm}>
          Move to {WALLETS[to].label}
        </BaseBtn>
      </div>
    </WindowShell>
  )
}
