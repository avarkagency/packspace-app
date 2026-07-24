"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef } from "react"

import { chainTag } from "@/lib/chain"
import { coinView, useCoinHover } from "@/lib/coin-store"
import { dayChange } from "@/lib/data"
import { useDrag } from "@/lib/drag-store"
import type { DesktopObj } from "@/lib/types"
import { cn, shortAddr, usd } from "@/lib/utils"

import { BaseChangeTag } from "../base/BaseChangeTag"
import { BaseScrambleText } from "../base/BaseScrambleText"
import { artImage } from "../canvas/object-art"
import { chainImage, objectKindLabel, objectTint } from "../canvas/objectVisual"
import { ContactAvatar } from "./ContactAvatar"

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

/** A folder's peek: its name and the objects it holds, resolved from the flat lists. The readout shows
 *  the first few so a folder says what's inside without opening it. */
export type FolderPreview = { id: string; label: string; items: DesktopObj[] }

/** Most rows a folder peek ever shows before it rolls the rest into a "+N more" line. Anything can be
 *  filed, so the list stays generic — art, name, and the one figure that matters for that class. */
const FOLDER_ROWS = 5

type Row = { label: string; value: string; icon?: string | null; tag?: { label: string; color: string } | null; changePct?: number }

function rowsFor(obj: DesktopObj): Row[] {
  const network: Row = {
    label: "Network",
    value: obj.chain ?? "—",
    icon: obj.chain ? chainImage(obj.chain) : null,
    tag: chainTag(obj)
  }

  if (obj.class === "person")
    return [
      { label: "Type", value: objectKindLabel(obj) },
      { label: "Handle", value: obj.handle },
      { label: "Trust", value: obj.trust },
      network,
      { label: "Address", value: obj.address ? shortAddr(obj.address) : "—" }
    ]

  // the holding's value leads; its 24h move follows on its own line as a green/red tag (only when it moved)
  const rows: Row[] = [{ label: "Value", value: usd(obj.usd, { cents: false }) }]
  const change = dayChange(obj.symbol)
  if (change !== undefined) rows.push({ label: "24h", value: "", changePct: change })

  return [...rows, { label: "Type", value: objectKindLabel(obj) }, network, { label: "Address", value: obj.address ? shortAddr(obj.address) : "—" }]
}

/** Flip rather than spill against the desktop's edges. `coinView.clip` is already exactly that box —
 *  it's what the objects themselves clip to. */
function aimAt(x: number, y: number, height: number) {
  const { right, bottom } = coinView.clip
  const dx = x + GAP + WIDTH > right ? -(GAP + WIDTH) : GAP
  const dy = y + GAP + height > bottom ? -(GAP + height) : GAP
  return { x: x + dx, y: y + dy }
}

export function ObjectHoverInfo({ items, folders = [] }: { items: DesktopObj[]; folders?: FolderPreview[] }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const heightRef = useRef(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const seededRef = useRef(false)

  // hover / drag
  const hoverId = useCoinHover()
  const { obj: dragging, carriedIds } = useDrag()

  // data — the readout stands down while anything is in hand, one object or a carried selection. A
  // hovered id is an object or, failing that, a folder — both ride the same cursor-trailing panel.
  const obj = hoverId ? items.find((o) => o.id === hoverId) : null
  const folder = hoverId && !obj ? folders.find((f) => f.id === hoverId) : null
  const show = (!!obj || !!folder) && !dragging && !carriedIds

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

  if ((!obj && !folder) || !show) return null

  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[900]" style={{ width: WIDTH, willChange: "transform" }}>
      {folder ? <FolderPeek folder={folder} /> : obj && <ObjectPeek obj={obj} />}
    </div>
  )
}

/** The object readout — the type, network and raw address the icon can't carry itself. */
function ObjectPeek({ obj }: { obj: DesktopObj }) {
  return (
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
              {/* the chain-family tag (EVM / SOL / BTC / MULTI), worn beside the network name */}
              {row.tag && (
                <span
                  className="shrink-0 rounded-4 px-3 py-px text-[8.5px] leading-none font-extrabold tracking-wide text-white"
                  style={{ background: row.tag.color }}>
                  {row.tag.label}
                </span>
              )}
              {/* the 24h move, worn beside the value — same green/red tag as the desk pill */}
              {row.changePct !== undefined && <BaseChangeTag pct={row.changePct} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** The folder peek — a glance at what's filed inside, without opening the window. Anything can live in a
 *  folder, so each line stays generic: the item's art, its name, and the single figure that reads for its
 *  class (an asset's value, a contact's handle/address). Only the first FOLDER_ROWS show; the rest roll
 *  into a "+N more" tail so the panel never grows past a peek. */
function FolderPeek({ folder }: { folder: FolderPreview }) {
  const shown = folder.items.slice(0, FOLDER_ROWS)
  const overflow = folder.items.length - shown.length
  const total = folder.items.reduce((sum, o) => (o.class === "asset" ? sum + o.usd : sum), 0)

  return (
    <div key={folder.id} className="panel rounded-lg px-12 py-10">
      <div className="flex items-center justify-between gap-10">
        <p className="min-w-0 truncate text-13 font-semibold text-white">
          <BaseScrambleText text={folder.label} />
        </p>
        {total > 0 && <span className="tnum shrink-0 text-11 font-medium text-white/60">{usd(total, { cents: false })}</span>}
      </div>

      {folder.items.length === 0 ? (
        <p className="mt-6 text-11 text-white/40">Empty — drop items here to file them.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {shown.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-10">
              <span className="flex min-w-0 items-center gap-8">
                <FolderItemArt obj={item} />
                <span className="truncate text-11 font-medium text-white/85">{item.label}</span>
              </span>
              <span className="tnum shrink-0 text-11 text-white/60">
                {item.class === "asset" ? usd(item.usd, { cents: false }) : (item.address ? shortAddr(item.address) : item.handle)}
              </span>
            </li>
          ))}
          {overflow > 0 && <li className="pt-2 text-11 text-white/40">+{overflow} more</li>}
        </ul>
      )}
    </div>
  )
}

/** One folder row's mark — the flat cousin of the desk icon's face: shipped art where a symbol has it
 *  (round for a coin, a rounded square for an NFT), a tinted monogram where it doesn't, and the gradient
 *  avatar for a contact. */
function FolderItemArt({ obj }: { obj: DesktopObj }) {
  if (obj.class === "person") return <ContactAvatar id={obj.id} size={18} />

  const art = artImage(obj.symbol)
  if (art)
    return (
      <Image
        src={art}
        alt=""
        width={18}
        height={18}
        unoptimized
        className={cn("size-18 shrink-0 object-cover", obj.kind === "nft" ? "rounded-4" : "rounded-full")}
      />
    )

  return (
    <span
      className="grid size-18 shrink-0 place-items-center rounded-4 text-[8px] font-semibold"
      style={{ background: `${objectTint(obj)}33`, color: objectTint(obj) }}>
      {obj.symbol.slice(0, 3)}
    </span>
  )
}
