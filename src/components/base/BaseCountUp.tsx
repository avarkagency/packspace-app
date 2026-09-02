"use client"

import { useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

export function BaseCountUp({
  value,
  format,
  duration = 1.1,
  delay = 0,
  className = ""
}: {
  value: number
  format: (n: number) => string
  duration?: number
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (reduced) {
        el.textContent = format(value)
        return
      }
      el.textContent = format(0)
      const o = { v: 0 }
      gsap.to(o, { v: value, duration, delay, ease: "power2.out", onUpdate: () => (el.textContent = format(o.v)) })
    },
    { dependencies: [value] }
  )

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
