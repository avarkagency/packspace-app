"use client"

import Image from "next/image"
import { useState } from "react"

import type { AssetObj } from "@/types/objects"
import { ArrowRight, WalletCards, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { BaseSlider } from "@/components/base/BaseSlider"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"

import { cn, units, usd } from "@/lib/utils"
import { WALLETS, type Wallet } from "@/lib/wallets"

// Moving a holding between your OWN two wallets — the split view's cross-divider drop.
//
// Not a Send: there's no counterparty, no trust check and nothing leaves your custody, so the copy says
// "move" throughout and the receipt files as a Move rather than a transfer. A fungible holding can move
// in part (the slider); a one-of-one moves whole. Addresses never reach this window — they copy across
// on release, with nothing to decide.
//
// If the destination wallet already holds the same token, the two pool by default — otherwise you'd end
// up with two piles of the same thing for no reason. Untick it to keep them as separate objects.

type Props = {
  asset: AssetObj
  from: Wallet
  to: Wallet
  /** A matching holding already in the destination wallet, if any — the merge target. */
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
            Move {asset.label}
          </h2>

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

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

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

          {/* pooling with what's already over there */}
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
      </div>
    </div>
  )
}
