"use client"

import { useState } from "react"

import type { PackContent, PackObj } from "@/types/objects"
import { Lock, PackageOpen } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { units } from "@/lib/utils"

type Props = {
  pack: PackObj
  onClose: () => void
  onUnpack: (pack: PackObj) => void
}

export function WindowUnpack({ pack, onClose, onUnpack }: Props) {
  // state
  const [input, setInput] = useState("")

  // data
  const items: PackContent[] = pack.items ?? []
  const randomized = pack.packType === "Randomized"
  const showLock = !!pack.locked && pack.lockKind === "Password"
  const unlocked = !pack.locked || (pack.lockKind === "Password" && input === pack.password)

  return (
    <WindowShell z={220} width={380} onClose={onClose}>
      <div className="p-28">
        <WindowHeading icon={<PackageOpen className="size-20 text-[#f7c86a]" />} title={pack.label} chip={pack.standard ?? "ERC-721"} />

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
    </WindowShell>
  )
}
