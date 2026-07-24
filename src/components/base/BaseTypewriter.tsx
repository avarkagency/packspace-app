"use client"

import { Fragment, useMemo, useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

// Reveals the text one character at a time, left to right — a plain typewriter of the real letters. The
// layout is reserved up front (unrevealed characters are hidden with `visibility`, not removed) so the
// text appears in place rather than reflowing, and each word is a nowrap unit so a line break never
// splits one mid-word.

const TYPE_STEP = 0.03 // seconds per character
const MAX_TOTAL = 1.8 // cap, so a long paragraph doesn't crawl

export function BaseTypewriter({ text, className = "" }: { text: string; className?: string }) {
  // refs
  const rootRef = useRef<HTMLSpanElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])

  // data — characters, grouped into words (runs of non-space) with each word's starting index so the char
  // spans still key off the original position
  const chars = useMemo(() => Array.from(text), [text])
  const words = useMemo(() => {
    const out: { start: number; chars: string[] }[] = []
    let i = 0
    while (i < chars.length) {
      if (chars[i] === " ") {
        i++
        continue
      }
      const start = i
      const w: string[] = []
      while (i < chars.length && chars[i] !== " ") {
        w.push(chars[i])
        i++
      }
      out.push({ start, chars: w })
    }
    return out
  }, [chars])

  // hooks
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      const spans = charsRef.current.filter(Boolean)
      if (reduced) {
        spans.forEach((s) => (s.style.visibility = "visible"))
        return
      }
      spans.forEach((s) => (s.style.visibility = "hidden"))
      const step = Math.min(TYPE_STEP, MAX_TOTAL / Math.max(1, spans.length))
      const tl = gsap.timeline()
      spans.forEach((s, i) => {
        tl.to({}, { duration: step, onStart: () => (s.style.visibility = "visible") }, i === 0 ? 0 : ">")
      })
    },
    { scope: rootRef, dependencies: [chars, reduced] }
  )

  return (
    <span ref={rootRef} className={className}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          {wi > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {word.chars.map((c, k) => {
              const idx = word.start + k
              return (
                <span
                  key={idx}
                  ref={(el) => {
                    if (el) charsRef.current[idx] = el
                  }}
                  className="inline-block">
                  {c}
                </span>
              )
            })}
          </span>
        </Fragment>
      ))}
    </span>
  )
}
