"use client"

import { useState } from "react"

import type { PackContent, PackObj } from "@/types/objects"
import { Lock, PackageOpen, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"

import { units } from "@/lib/utils"

// Unpack — open a Pack and claim its contents back onto the desk. A password-locked pack gates behind
// the passphrase; a randomized pack reveals one of its possible contents. Fungibles merge back into any
// matching balance you already hold. Wears the shared glass frame.

type Props = {
  pack: PackObj
  onClose: () => void
  onUnpack: (pack: PackObj) => void
}

export function UnpackWindow({ pack, onClose, onUnpack }: Props) {
  // state
  const [input, setInput] = useState("")

  // data
  const items: PackContent[] = pack.items ?? []
  const randomized = pack.packType === "Randomized"
  const showLock = !!pack.locked && pack.lockKind === "Password"
  const unlocked = !pack.locked || (pack.lockKind === "Password" && input === pack.password)

  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: 220 }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 380 }}>
        <div className="p-28">
          <h2 className="flex items-center gap-8 text-18 leading-120 tracking-tight text-white">
            <PackageOpen className="size-20 text-[#f7c86a]" />
            {pack.label}
          </h2>
          <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{pack.standard ?? "ERC-721"}</span>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          <p className="mt-24 text-12 leading-140 text-white/60">
            {randomized ? "Randomized reveal — you'll receive one of:" : "Unpacking claims these back into your wallet:"}
          </p>

          <ul className="mt-12 flex flex-col gap-8">
            {items.map((c, i) => (
              <li key={`${c.refId ?? c.symbol}-${i}`} className="flex items-center gap-10 rounded-md border border-white/10 bg-white/5 p-8">
                <span className="grid size-32 shrink-0 place-items-center rounded-full text-14 font-bold text-white" style={{ background: c.color }}>
                  {c.glyph ?? c.symbol.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 truncate text-13 leading-120 font-medium text-white">{c.label}</span>
                <span className="tnum text-12 leading-120 text-white/70">{c.kind === "nft" ? "1 of 1" : `${units(c.amount)} ${c.symbol}`}</span>
              </li>
            ))}
          </ul>

          {showLock && (
            <div className="mt-16 flex items-center gap-8 rounded-md border border-[#f7c86a]/30 bg-[#f7c86a]/10 px-12 py-8">
              <Lock className="size-16 shrink-0 text-[#f7c86a]" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="password"
                placeholder="Enter password to unlock"
                className="w-full bg-transparent text-13 text-white outline-none placeholder:text-white/40"
              />
            </div>
          )}

          <div className="mt-24 flex gap-8">
            <BaseBtn variant="secondary" className="flex-1" onClick={onClose}>
              Close
            </BaseBtn>
            <BaseBtn
              icon={PackageOpen}
              className="flex-1"
              disabled={!unlocked}
              onClick={() => {
                onUnpack(pack)
                onClose()
              }}>
              {randomized ? "Reveal & claim" : "Unpack & claim"}
            </BaseBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
