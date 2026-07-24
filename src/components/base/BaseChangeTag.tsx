"use client"

import { useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { cn } from "@/lib/utils"

// The 24h price-change tag worn inside an asset's price pill — green up, red down. The caller decides
// whether a tag is due at all (lib/data's dayChange returns undefined for flat movers), so this only ever
// renders a real move. `big` is the larger Inspector size; `countUp` ticks the number up on mount (its
// colour is fixed to the final sign, so it never flips green↔red on the way).

const fmt = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`

export function BaseChangeTag({ pct, big = false, countUp = false, delay = 0 }: { pct: number; big?: boolean; countUp?: boolean; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()
  const up = pct > 0

  useGSAP(
    () => {
      if (!countUp) return
      const el = ref.current
      if (!el) return
      if (reduced) {
        el.textContent = fmt(pct)
        return
      }
      el.textContent = fmt(0)
      const o = { v: 0 }
      gsap.to(o, { v: pct, duration: 1.1, delay, ease: "power2.out", onUpdate: () => (el.textContent = fmt(o.v)) })
    },
    { dependencies: [pct, countUp, delay] }
  )

  return (
    <span
      className={cn(
        "tnum shrink-0 rounded-full py-2 leading-none font-bold",
        big ? "px-3 text-[10.5px]" : "px-2 text-[8.5px]",
        up ? "bg-[#13e192]/20 text-[#13e192]" : "bg-[#ef5a44]/30 text-[#ff7d66]"
      )}>
      {countUp ? <span ref={ref}>{fmt(pct)}</span> : fmt(pct)}
    </span>
  )
}
