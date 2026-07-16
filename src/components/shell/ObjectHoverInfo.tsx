"use client"

import { useEffect, useLayoutEffect, useRef } from "react"

import { coinView, useCoinHover } from "@/lib/coin-store"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj, PackObj } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { BaseScrambleText } from "../base/BaseScrambleText"
import { objectKindLabel } from "../canvas/objectVisual"

// The readout that rides with the cursor while an object is hovered. It carries only what the cell
// doesn't already say — the cell has the holding, the value and the network mark, so this has the name,
// the type, the network's name and the raw address (truth-always-available, spec DEV5).
//
// It trails the cursor rather than pinning to it: a readout welded to the pointer reads as part of the
// cursor, where a slight lag reads as an object being carried along. Position is lerped in a frame loop
// and written imperatively, like the drag label — this moves every frame and must never re-render to do
// it. It re-renders only when the hovered object changes, which is also what replays the scramble.

const GAP = 18
const WIDTH = 240
const LERP = 16 // per second — enough lag to feel carried, not enough to feel late

type Row = { label: string; value: string }

function rowsFor(obj: AssetObj | PackObj): Row[] {
  if (obj.class === "pack")
    return [
      { label: "Type", value: objectKindLabel(obj) },
      { label: "Contents", value: obj.contents },
      { label: "Network", value: obj.chain ?? "—" },
      { label: "State", value: obj.sealed ? "Sealed" : "Opened" }
    ]

  return [
    { label: "Type", value: objectKindLabel(obj) },
    { label: "Network", value: obj.chain ?? "—" },
    { label: "Address", value: obj.address ? shortAddr(obj.address) : "—" }
  ]
}

/** Flip rather than spill, against the *grid's* edges rather than the viewport's — the readout belongs to
 *  the grid, and the rail and the split dock own what's beyond it. `coinView.clip` is already exactly
 *  that box: it's what the objects themselves clip to, and it tracks the dock as it slides. */
function aimAt(x: number, y: number, height: number) {
  const { right, bottom } = coinView.clip
  const dx = x + GAP + WIDTH > right ? -(GAP + WIDTH) : GAP
  const dy = y + GAP + height > bottom ? -(GAP + height) : GAP
  return { x: x + dx, y: y + dy }
}

export function ObjectHoverInfo({ items }: { items: (AssetObj | PackObj)[] }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const heightRef = useRef(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const seededRef = useRef(false)

  // hover / drag
  const hoverId = useCoinHover()
  const { asset: dragging } = useDrag()

  // data — the drag label already rides the cursor, so this stands down while one is in hand
  const obj = hoverId ? items.find((o) => o.id === hoverId) : null
  const show = !!obj && !dragging

  // effects — measure and aim before the first paint. On the way in it snaps to the cursor; after that
  // the frame loop below eases it, so moving between objects trails rather than teleports.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !show) {
      seededRef.current = false
      return
    }

    heightRef.current = el.offsetHeight
    targetRef.current = aimAt(coinView.cursor.x, coinView.cursor.y, heightRef.current)

    if (!seededRef.current) {
      posRef.current = { ...targetRef.current }
      seededRef.current = true
      el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
    }
  }, [show, hoverId])

  useEffect(() => {
    if (!show) return

    const onMove = (e: PointerEvent) => {
      targetRef.current = aimAt(e.clientX, e.clientY, heightRef.current)
    }
    window.addEventListener("pointermove", onMove)

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      // clamp the delta so a stalled frame doesn't teleport it
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const k = Math.min(1, dt * LERP)
      const pos = posRef.current
      pos.x += (targetRef.current.x - pos.x) * k
      pos.y += (targetRef.current.y - pos.y) * k
      if (ref.current) ref.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [show])

  if (!obj || !show) return null

  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[900]" style={{ width: WIDTH, willChange: "transform" }}>
      <div key={obj.id} className="fui-glass rounded-md px-12 py-10 shadow-[0_12px_40px_-12px_#000000cc]">
        <p className="truncate text-13 font-semibold text-foreground">
          <BaseScrambleText text={obj.label} />
        </p>
        <dl className="mt-8 flex flex-col gap-4">
          {rowsFor(obj).map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-10">
              <dt className="shrink-0 text-10 tracking-wide text-muted-foreground/60 uppercase">{row.label}</dt>
              <dd className="tnum truncate text-11 text-accent">
                <BaseScrambleText text={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
