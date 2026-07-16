"use client"

import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

// One button for all three object actions — caution-hatched, in the action's own signal. Send, Trade and
// Split are the same gesture with different consequences, so they're the same control; only the colour
// says which. None of them belong to the chrome's cyan, which is why they each have a signal of their
// own rather than borrowing the accent.
//
// Every zone is both a drop target and a button: drag a coin onto it, or click it for the selected one.

export type ActionTone = "send" | "trade" | "split" | "neutral"

const TONE: Record<ActionTone, string> = {
  send: "var(--action-send)",
  trade: "var(--action-trade)",
  split: "var(--action-split)",
  // no signal of its own — an action that isn't about an object takes the text colour
  neutral: "var(--foreground)"
}

/** Alpha via color-mix rather than the codebase's usual hex-alpha suffix: these are `var()`s, and you
 *  can't concatenate onto one. */
const mix = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

type Props = {
  label: string
  tone: ActionTone
  /** Omit for an action that isn't a drop target — the button and the zone are the same control. */
  dropKey?: string
  /** There's an asset to act on. Without one the zone is inert to clicks but keeps its `data-drop` — a
   *  drop only happens mid-drag, which always carries an asset. */
  live?: boolean
  isOver?: boolean
  /** The object in hand can't take this action — refuse it on approach rather than at the modal. */
  refuses?: boolean
  refusedLabel?: string
  focusable?: boolean
  className?: string
  onClick?: () => void
}

export function ActionZone({
  label,
  tone,
  dropKey,
  live = true,
  isOver = false,
  refuses = false,
  refusedLabel = "Can't",
  focusable = true,
  className = "",
  onClick
}: Props) {
  const color = refuses ? "var(--danger)" : TONE[tone]

  return (
    <button
      data-drop={dropKey}
      onClick={() => live && !refuses && onClick?.()}
      aria-disabled={!live || refuses}
      tabIndex={focusable ? 0 : -1}
      style={
        {
          "--zone-stripe": mix(color, 20),
          borderColor: mix(color, isOver ? 100 : 50),
          backgroundColor: mix(color, isOver ? 35 : 10),
          boxShadow: isOver ? `0 0 32px -6px ${color}` : undefined
        } as CSSProperties
      }
      className={cn("fui-zone grid h-56 w-full place-items-center border text-16 font-bold text-white uppercase trans-base", className)}
    >
      {refuses ? refusedLabel : label}
    </button>
  )
}
