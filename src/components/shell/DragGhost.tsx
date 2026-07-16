"use client"

import type { RefObject } from "react"

import { useDrag } from "@/lib/drag-store"
import { units, usd } from "@/lib/utils"

import { objectTint } from "../canvas/objectVisual"

// The label that tracks the pointer during a drag. The coin itself is the ghost — it lifts out of the
// grid on the canvas overlay and flies at the cursor — so this is only the readout that rides under it,
// keeping the grid's "data sits under the coin" arrangement intact mid-drag.
//
// Positioned imperatively via `ghostRef` (transform written in the pointer handler) so it never
// re-renders per frame.

/** Breathing room between the lifted coin's edge and the label. The pointer handler adds this to the
 *  coin's measured radius and writes the result to `--ghost-shift`, flipping the label above the coin
 *  when a drag nears the bottom edge (where the split dock lives). */
export const GHOST_GAP = 14
/** The label's own height, so the flipped position can account for it. */
export const GHOST_HEIGHT = 44

export function DragGhost({ ghostRef }: { ghostRef: RefObject<HTMLDivElement | null> }) {
  const { asset } = useDrag()
  if (!asset) return null
  const tint = objectTint(asset)

  return (
    <div ref={ghostRef} className="pointer-events-none fixed top-0 left-0 z-[999]" style={{ willChange: "transform" }}>
      <div
        className="fui-glass -translate-x-1/2 rounded-md px-12 py-6 text-center leading-110 shadow-[0_0_32px_-4px_var(--accent)]"
        style={{ borderColor: `${tint}88`, marginTop: "var(--ghost-shift, 96px)" }}
      >
        <p className="text-12 font-medium">{asset.label}</p>
        <p className="tnum text-10 text-accent">
          {units(asset.balance)} {asset.symbol} · {usd(asset.usd)}
        </p>
      </div>
    </div>
  )
}
