"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef } from "react"

import { coinView, useCoinHover } from "@/lib/coin-store"
import { useDrag } from "@/lib/drag-store"
import type { DesktopObj } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { BaseScrambleText } from "../base/BaseScrambleText"
import { chainImage, objectKindLabel } from "../canvas/objectVisual"

// The readout that rides with the cursor while an object is hovered. It carries only what the icon
// doesn't already say — the icon has the holding and the name, so this has the type, the network and
// the raw address (truth-always-available, spec DEV5).
//
// It trails the cursor rather than pinning to it: a readout welded to the pointer reads as part of the
// cursor, where a slight lag reads as an object being carried along. Position is lerped in a frame loop
// and written imperatively, like the drag label — this moves every frame and must never re-render to do
// it. It re-renders only when the hovered object changes.

const GAP = 18
const WIDTH = 240
const LERP = 16 // per second — enough lag to feel carried, not enough to feel late

type Row = { label: string; value: string; icon?: string | null }

function rowsFor(obj: DesktopObj): Row[] {
  const network: Row = { label: "Network", value: obj.chain ?? "—", icon: obj.chain ? chainImage(obj.chain) : null }

  if (obj.class === "person")
    return [
      { label: "Type", value: objectKindLabel(obj) },
      { label: "Handle", value: obj.handle },
      { label: "Trust", value: obj.trust },
      network,
      { label: "Address", value: obj.address ? shortAddr(obj.address) : "—" }
    ]

  return [{ label: "Type", value: objectKindLabel(obj) }, network, { label: "Address", value: obj.address ? shortAddr(obj.address) : "—" }]
}

/** Flip rather than spill against the desktop's edges. `coinView.clip` is already exactly that box —
 *  it's what the objects themselves clip to. */
function aimAt(x: number, y: number, height: number) {
  const { right, bottom } = coinView.clip
  const dx = x + GAP + WIDTH > right ? -(GAP + WIDTH) : GAP
  const dy = y + GAP + height > bottom ? -(GAP + height) : GAP
  return { x: x + dx, y: y + dy }
}

export function ObjectHoverInfo({ items }: { items: DesktopObj[] }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const heightRef = useRef(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const seededRef = useRef(false)

  // hover / drag
  const hoverId = useCoinHover()
  const { obj: dragging, carriedIds } = useDrag()

  // data — the readout stands down while anything is in hand, one object or a carried selection
  const obj = hoverId ? items.find((o) => o.id === hoverId) : null
  const show = !!obj && !dragging && !carriedIds

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
      <div key={obj.id} className="panel rounded-lg px-12 py-10">
        <p className="truncate text-13 font-semibold text-white">
          <BaseScrambleText text={obj.label} />
        </p>
        <dl className="mt-6 flex flex-col gap-4">
          {rowsFor(obj).map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-10">
              <dt className="shrink-0 text-11 text-white/50">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-6 text-11 font-medium text-white/80">
                {/* `unoptimized` for the same reason as everywhere these marks appear: Next's dev image
                    converter drops the connection on the tiny variants it would request */}
                {row.icon && <Image src={row.icon} alt="" width={16} height={16} unoptimized className="size-16 shrink-0 rounded-full object-cover" />}
                <span className="tnum truncate">
                  <BaseScrambleText text={row.value} />
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
