"use client"

import { useRef } from "react"

import { TRASH_DROP_KEY } from "@/lib/asset-ops"
import { setCoinCursor, setCoinHover } from "@/lib/coin-store"
import { endDrag, setOver, startDrag } from "@/lib/drag-store"
import type { DesktopObj } from "@/lib/types"

/** How much recent movement feeds the release velocity. Short on purpose: it should read the flick at
 *  the end of the gesture, not the average of the whole drag. */
const VELOCITY_WINDOW_MS = 100

// Pointer-driven drag for every desktop object. Starts after a small threshold (so a stray press
// doesn't lift the coin), and resolves on up:
//
//   - released over a `[data-drop]` zone this object can use → that action (the transfer modal,
//     combine, or the trash)
//   - anything else → the object moves there, carrying the release velocity so a moving let-go
//     slingshots rather than stopping dead. This is an editable desktop; letting go IS placing.
//
// There is no separate drag ghost: `onDragMove` moves the real icon — label, badge and all — and the
// coin follows the slot it always follows, so an object in hand IS the object at rest, just in motion.
// (The workspace makes the dragged icon pointer-transparent, which is what lets `elementFromPoint` see
// the drop zones underneath it.) A wallet in hand recognises exactly one zone — the trash; every other
// key belongs to asset drags.

export function useDesktopDrag(handlers: {
  onDrop: (obj: DesktopObj, dropKey: string) => void
  /** Place the object with its coin centred at (x, y) — the cursor at release — arriving at
   *  (vx, vy) px/s. A stationary release reports ~0. */
  onMove: (obj: DesktopObj, x: number, y: number, vx: number, vy: number) => void
  /** The object is mid-drag with its coin centred at (x, y) — carry the icon along. */
  onDragMove: (obj: DesktopObj, x: number, y: number) => void
}) {
  const drag = useRef<{ obj: DesktopObj; sx: number; sy: number; started: boolean } | null>(null)
  const samples = useRef<{ x: number; y: number; t: number }[]>([])

  const dropAt = (x: number, y: number): string | null =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-drop]")?.getAttribute("data-drop") ?? null

  /** The zone under the cursor, filtered to what this object may actually drop on. */
  const zoneFor = (obj: DesktopObj, x: number, y: number): string | null => {
    const key = dropAt(x, y)
    if (!key) return null
    if (obj.class === "person") return key === TRASH_DROP_KEY ? key : null
    return key
  }

  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
      d.started = true
      // drop the hover: the readout would otherwise ride along under the coin the whole drag
      setCoinHover(null)
      startDrag(d.obj)
    }
    setCoinCursor(e.clientX, e.clientY)
    handlers.onDragMove(d.obj, e.clientX, e.clientY)
    setOver(zoneFor(d.obj, e.clientX, e.clientY))

    // roll the velocity window forward — only the samples inside it survive
    const now = performance.now()
    const s = samples.current
    s.push({ x: e.clientX, y: e.clientY, t: now })
    while (s.length && now - s[0].t > VELOCITY_WINDOW_MS) s.shift()
  }

  /** The gesture's speed at the moment of release, from the samples still inside the window. A pause
   *  before letting go empties the window of any distance, so it reads as zero — only an actual flick
   *  slingshots. */
  const releaseVelocity = () => {
    const s = samples.current
    samples.current = []
    if (s.length < 2) return { vx: 0, vy: 0 }
    const a = s[0]
    const b = s[s.length - 1]
    const dt = (b.t - a.t) / 1000
    if (dt < 0.016) return { vx: 0, vy: 0 }
    return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt }
  }

  const onUp = (e: PointerEvent) => {
    const d = drag.current
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    drag.current = null
    const { vx, vy } = releaseVelocity()
    if (d?.started) {
      const key = zoneFor(d.obj, e.clientX, e.clientY)
      if (key) handlers.onDrop(d.obj, key)
      else handlers.onMove(d.obj, e.clientX, e.clientY, vx, vy)
    }
    endDrag()
  }

  const onPointerDown = (obj: DesktopObj) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { obj, sx: e.clientX, sy: e.clientY, started: false }
    samples.current = []
    setCoinCursor(e.clientX, e.clientY)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return { onPointerDown }
}
