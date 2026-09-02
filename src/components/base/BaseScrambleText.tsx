"use client"

import { useMemo, useRef } from "react"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

type BaseScrambleTextProps = {
  text: string
  duration?: number
  className?: string
}

const FPS = 30
const GLYPHS = ["?", "_", "/", "*", "^", "X"] as const

// a lone space inside an inline-block span collapses to nothing, so spaces ride as non-breaking
const visibleChar = (c: string) => (c === " " ? "\u00A0" : c)
const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

export function BaseScrambleText({ text, duration = 0.3, className = "" }: BaseScrambleTextProps) {
  // refs
  const rootRef = useRef<HTMLSpanElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])

  // data
  const chars = useMemo(() => Array.from(text), [text])

  useGSAP(
    () => {
      const setToText = () => charsRef.current.forEach((span, i) => span && (span.textContent = visibleChar(chars[i])))
      const steps = Math.max(1, Math.round(duration * FPS))
      const tl = gsap.timeline()

      for (let step = 0; step <= steps; step++) {
        const revealed = Math.floor((step / steps) * chars.length)
        tl.to(
          {},
          {
            duration: duration / steps,
            onStart: () =>
              charsRef.current.forEach((span, i) => {
                if (!span) return
                // spaces hold their width, or the text reflows as it resolves
                span.textContent = chars[i] === " " ? "\u00A0" : i < revealed ? chars[i] : randGlyph()
              })
          },
          step === 0 ? 0 : ">"
        )
      }

      tl.to({}, { duration: 0.01, onStart: setToText }, ">")
    },
    { scope: rootRef, dependencies: [chars, duration] }
  )

  return (
    <span ref={rootRef} className={className} style={{ whiteSpace: "pre-wrap" }}>
      {chars.map((c, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) charsRef.current[i] = el
          }}
          className="inline-block">
          {visibleChar(c)}
        </span>
      ))}
    </span>
  )
}
