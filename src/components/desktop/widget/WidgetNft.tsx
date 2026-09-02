"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import type { AssetObj } from "@/types/objects"

import { BaseChangeTag } from "@/components/base/BaseChangeTag"

import { artImage } from "@/lib/object-art"
import { cn, desktopLabel, usd } from "@/lib/utils"

import { dayChange } from "@/data/assets"

const FADE = "linear-gradient(to bottom, #000 84%, transparent 100%)"

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
function metrics(span: 1 | 2) {
  return { card: span === 2 ? 86 : 59, step: span === 2 ? 56 : 42 }
}

function coverStyle(offset: number, card: number): { transform: string; zIndex: number; opacity: number } {
  if (offset === 0) return { transform: "translateX(0px) translateZ(72px) rotateY(0deg) scale(1)", zIndex: 50, opacity: 1 }
  const abs = Math.abs(offset)
  const sign = Math.sign(offset)
  const x = sign * (card * 0.52 + (abs - 1) * card * 0.42)
  const z = -abs * 46
  const opacity = abs > 3 ? 0 : abs === 3 ? 0.35 : abs === 2 ? 0.7 : 0.95
  return { transform: `translateX(${x}px) translateZ(${z}px) rotateY(${-sign * 52}deg) scale(0.9)`, zIndex: 50 - abs, opacity }
}

export function WidgetNft({ assets, span }: { assets: AssetObj[]; span: 1 | 2 }) {
  // refs
  const movedRef = useRef(false)

  // state
  const [active, setActive] = useState(0)

  // data
  const nfts = assets.filter((a) => a.kind === "nft").sort((a, b) => b.usd - a.usd)
  const idx = clamp(active, 0, Math.max(0, nfts.length - 1))
  const current = nfts[idx]
  const delta = current ? dayChange(current.symbol) : undefined
  const { card, step } = metrics(span)

  // events
  const onStagePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    movedRef.current = false
    if (nfts.length < 2) return
    const startX = e.clientX
    const startIdx = idx
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > 4) movedRef.current = true
      setActive(clamp(Math.round(startIdx - dx / step), 0, nfts.length - 1))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  if (nfts.length === 0) return <div className="glass grid h-full place-items-center rounded-16 text-11 leading-120 text-white/40">No NFTs</div>

  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-16">
      <div className="relative min-h-0 w-full flex-1">
        <div
          onPointerDown={onStagePointerDown}
          className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
          style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
          <div className="absolute inset-0" style={{ perspective: 640 }}>
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {nfts.map((n, i) => {
                const s = coverStyle(i - idx, card)
                const art = artImage(n.symbol)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!movedRef.current) setActive(i)
                    }}
                    className="absolute top-1/2 left-1/2 cursor-grab active:cursor-grabbing"
                    style={{
                      width: card,
                      height: card,
                      marginLeft: -card / 2,
                      marginTop: -card / 2,
                      transform: s.transform,
                      zIndex: s.zIndex,
                      opacity: s.opacity,
                      pointerEvents: s.opacity === 0 ? "none" : "auto",
                      transition: "transform 420ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms ease"
                    }}>
                    {art ? (
                      <Image
                        src={art}
                        alt={n.label}
                        width={card}
                        height={card}
                        unoptimized
                        draggable={false}
                        className="size-full rounded-8 object-cover"
                        style={{
                          boxShadow: "0 12px 26px rgba(0,0,0,0.28)",
                          WebkitBoxReflect: "below 2px linear-gradient(transparent 52%, rgba(0,0,0,0.3))"
                        }}
                      />
                    ) : (
                      <div className="grid size-full place-items-center rounded-8 bg-white/10 text-14 font-bold text-white">{n.symbol.slice(0, 3)}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {current && (
        <div className="flex items-center justify-between gap-8 px-16 pb-16 pt-2">
          <p className="tnum truncate text-12 font-medium leading-120 text-white">{desktopLabel(current)}</p>
          <span
            className={cn(
              "tnum flex shrink-0 items-center gap-4 rounded-full bg-white/20 py-2 pl-6 text-10 leading-120 text-white/90",
              delta !== undefined ? "pr-2" : "pr-6"
            )}>
            {usd(current.usd, { cents: false })}
            {delta !== undefined && <BaseChangeTag pct={delta} />}
          </span>
        </div>
      )}
    </div>
  )
}
