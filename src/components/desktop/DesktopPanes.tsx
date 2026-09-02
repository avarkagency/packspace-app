"use client"

import Image from "next/image"

import { LABEL_TOP } from "@/const/desktop-layout"
import { DIVIDER_W, type Pane, SPLIT_MAX, SPLIT_MIN } from "@/const/pane"
import { GripVertical } from "lucide-react"

import { shortAddr } from "@/lib/utils"
import { WALLETS, type Wallet } from "@/lib/wallets"

type Props = {
  panes: Record<Wallet, Pane>
  wallpapers: Record<Wallet, string>
  ratio: number
  onRatioChange: (ratio: number) => void
  onRatioCommit: () => void
}

export function DesktopPanes({ panes, wallpapers, ratio, onRatioChange, onRatioCommit }: Props) {
  // events
  const onDividerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const onMove = (ev: PointerEvent) => onRatioChange(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ev.clientX / window.innerWidth)))
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      onRatioCommit()
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const wallets = Object.keys(panes) as Wallet[]

  return (
    <>
      {wallets.map((w) => {
        const pane = panes[w]
        return (
          <div
            key={w}
            aria-hidden
            className="pointer-events-none fixed overflow-hidden"
            style={{ left: pane.left, top: pane.top, width: pane.width, height: pane.height }}>
            <div className="absolute top-0 h-screen w-screen" style={{ left: -pane.left, background: wallpapers[w] }} />
            <div className="absolute inset-0 shadow-[inset_0_0_240px_rgba(0,0,0,0.5)]" />
          </div>
        )
      })}

      {wallets.map((w) => {
        const pane = panes[w]
        const spec = WALLETS[w]
        return (
          <div
            key={`label-${w}`}
            className="glass pointer-events-none fixed z-[90] flex items-center gap-8 rounded-full px-12 py-6"
            style={{ left: pane.left + 16, top: LABEL_TOP, maxWidth: Math.max(0, pane.width - 32) }}>
            <Image src={spec.image} alt="" width={16} height={16} unoptimized className="size-16 shrink-0" />
            <span className="truncate text-12 leading-120 tracking-tight text-white">{spec.provider}</span>
            <span className="tnum shrink-0 font-mono text-10 leading-120 text-white/60">{shortAddr(spec.address)}</span>
          </div>
        )
      })}

      <div
        onPointerDown={onDividerDown}
        onContextMenu={(e) => e.preventDefault()}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize wallet panes"
        aria-valuenow={Math.round(ratio * 100)}
        className="fixed top-0 bottom-0 z-[95] flex cursor-col-resize touch-none items-center justify-center"
        style={{ left: panes.eoa.left - DIVIDER_W / 2, width: DIVIDER_W }}>
        <div className="h-full w-2 bg-white/20" aria-hidden />
        <div className="glass absolute grid h-56 w-28 place-items-center rounded-12 text-white/80" aria-hidden>
          <GripVertical className="size-16" />
        </div>
      </div>
    </>
  )
}
