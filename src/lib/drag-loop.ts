/** A pointer drag, as the desk keeps writing it: listeners on the window, a travel threshold before the
 *  gesture counts as a drag at all (so a press that never moves stays a click), and both listeners torn
 *  down on release. Deltas are from the press point; `onEnd` only fires for a drag that actually started. */
type DragLoop = {
  /** Fires once, the first time the pointer passes the threshold. */
  onStart?: (e: PointerEvent) => void
  onMove: (dx: number, dy: number, e: PointerEvent) => void
  onEnd?: (dx: number, dy: number, e: PointerEvent) => void
  /** Pixels of travel before the gesture counts as a drag; 0 starts on the first move. */
  threshold?: number
}

export function dragLoop(from: { clientX: number; clientY: number }, { onStart, onMove, onEnd, threshold = 0 }: DragLoop) {
  const sx = from.clientX
  const sy = from.clientY
  let started = threshold === 0

  const move = (e: PointerEvent) => {
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (!started) {
      if (Math.hypot(dx, dy) < threshold) return
      started = true
      onStart?.(e)
    }
    onMove(dx, dy, e)
  }
  const up = (e: PointerEvent) => {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    if (started) onEnd?.(e.clientX - sx, e.clientY - sy, e)
  }
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", up)
}
