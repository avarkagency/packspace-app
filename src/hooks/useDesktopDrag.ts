"use client"

import { useRef } from "react"

import { setCoinCursor, setCoinHover } from "@/stores/coin"
import { endDrag, setOver, startDrag } from "@/stores/drag"
import type { DesktopObj } from "@/types/objects"

import { FOLDER_DROP_PREFIX } from "@/lib/asset-ops"

// Pointer-driven drag for every desktop object. Starts after a small threshold (so a stray press
// doesn't lift the coin), and resolves on up:
//
//   - released over a `[data-drop]` zone this object can use → that action (the transfer modal,
//     combine, or a dock app)
//   - anything else → the object lands exactly where it was let go. This is an editable desktop;
//     letting go IS placing.
//
// There is no separate drag ghost: `onDragMove` moves the real icon — label, badge and all — and the
// coin follows the slot it always follows, so an object in hand IS the object at rest, just in motion.
// (The workspace makes the dragged icon pointer-transparent, which is what lets `elementFromPoint` see
// the drop zones underneath it.) A wallet in hand recognises no zones — deleting a contact lives in
// its right-click menu, so moving one is only ever a move.

export function useDesktopDrag(handlers: {
  onDrop: (obj: DesktopObj, dropKey: string) => void
  /** Place the object with its coin centred at (x, y) — the cursor at release. */
  onMove: (obj: DesktopObj, x: number, y: number) => void
  /** The object is mid-drag with its coin centred at (x, y) — carry the icon along. */
  onDragMove: (obj: DesktopObj, x: number, y: number) => void
}) {
  const drag = useRef<{ obj: DesktopObj; sx: number; sy: number; started: boolean; onStart?: (x: number, y: number) => void } | null>(null)

  const dropAt = (x: number, y: number): string | null =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-drop]")?.getAttribute("data-drop") ?? null

  /** The zone under the cursor, filtered to what this object may actually drop on. A wallet drag
   *  recognises only folders — moving one anywhere else is only ever a move. */
  const zoneFor = (obj: DesktopObj, x: number, y: number): string | null => {
    const key = dropAt(x, y)
    if (obj.class === "person") return key?.startsWith(FOLDER_DROP_PREFIX) ? key : null
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
      // the pick-up hook — a folder row uses this to materialise its object on the desk first
      d.onStart?.(e.clientX, e.clientY)
      startDrag(d.obj)
    }
    setCoinCursor(e.clientX, e.clientY)
    handlers.onDragMove(d.obj, e.clientX, e.clientY)
    setOver(zoneFor(d.obj, e.clientX, e.clientY))
  }

  const onUp = (e: PointerEvent) => {
    const d = drag.current
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    drag.current = null
    if (d?.started) {
      const key = zoneFor(d.obj, e.clientX, e.clientY)
      if (key) handlers.onDrop(d.obj, key)
      else handlers.onMove(d.obj, e.clientX, e.clientY)
    }
    endDrag()
  }

  const onPointerDown = (obj: DesktopObj, opts?: { onStart?: (x: number, y: number) => void }) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { obj, sx: e.clientX, sy: e.clientY, started: false, onStart: opts?.onStart }
    setCoinCursor(e.clientX, e.clientY)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return { onPointerDown }
}
