"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { TRASH_DROP_KEY, assetDropId, assetDropKey, canCombine, isSameToken, isSplittable, walletDropId, walletDropKey } from "@/lib/asset-ops"
import { coinView, registerCoinViewport, setCoinFrameTask } from "@/lib/coin-store"
import { ASSETS, CONNECTED_NETWORK, PEOPLE } from "@/lib/data"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj, DesktopObj, PersonObj, Receipt } from "@/lib/types"
import { cn, desktopLabel } from "@/lib/utils"

import { BAR_H, DesktopBar } from "../desktop/DesktopBar"
import { DesktopIcon, ICON_PAD, ICON_SLOT, ICON_W } from "../desktop/DesktopIcon"
import { DesktopMenu, type DesktopMenuItem } from "../desktop/DesktopMenu"
import { DesktopTrash } from "../desktop/DesktopTrash"
import { useDesktopDrag } from "../desktop/useDesktopDrag"
import { ObjectHoverInfo } from "../shell/ObjectHoverInfo"
import { CombineWindow } from "../windows/CombineWindow"
import { ContactWindow } from "../windows/ContactWindow"
import { DeleteWindow } from "../windows/DeleteWindow"
import { ReceiptWindow } from "../windows/ReceiptWindow"
import { SplitWindow } from "../windows/SplitWindow"
import { TransferWindow } from "../windows/TransferWindow"

// The desktop. A thin OS bar on top; below it, every object sits wherever it was last put — holdings
// start in columns on the left, wallets on the right, and dragging anywhere just places the icon there
// (a moving release keeps its momentum and coasts). Everything happens on the objects themselves:
// hover to inspect, drop a holding on a wallet to act on it (the transfer modal asks Send or Trade),
// drop onto a matching portion to combine, right-click for the object's own menu (Split on a token;
// Rename / Edit / Delete on a wallet). The desk itself right-clicks to housekeeping: New Contact,
// Change Wallpaper, Clean Up, Clean Up By.

// WebGL can't render on the server, and the coin faces are drawn to a 2D canvas at material-build time.
const ObjectScene = dynamic(() => import("../canvas/ObjectScene").then((m) => m.ObjectScene), { ssr: false })

type WinBody =
  | { kind: "transfer"; asset: AssetObj; to: PersonObj }
  | { kind: "split"; asset: AssetObj }
  | { kind: "combine"; a: AssetObj; b: AssetObj }
  | { kind: "contact"; contact: PersonObj }
  | { kind: "new-contact"; draft: PersonObj; at: Pos }
  | { kind: "delete-contact"; contact: PersonObj }
  | { kind: "receipt"; receipt: Receipt }

type WinDraft = WinBody & { matchKey: string }
type WinSpec = WinDraft & { id: string }

type MenuSpec = { x: number; y: number; obj: DesktopObj }

/** An icon's top-left corner, in viewport px. */
type Pos = { x: number; y: number }

// The default arrangement: columns of 4 filled top-to-bottom, assets from the left edge, wallets from
// the right — like a freshly set-up desk. Only the starting point; every drag rewrites it.
const EDGE = 28
const TOP = BAR_H + 24
const ROWS = 4
const COL_W = ICON_W + 16
const ROW_H = 128 // tall enough for slot + label + value pill

function defaultPositions(assets: AssetObj[], contacts: PersonObj[], width: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {}
  assets.forEach((a, i) => {
    pos[a.id] = { x: EDGE + Math.floor(i / ROWS) * COL_W, y: TOP + (i % ROWS) * ROW_H }
  })
  contacts.forEach((c, i) => {
    pos[c.id] = { x: width - EDGE - ICON_W - Math.floor(i / ROWS) * COL_W, y: TOP + (i % ROWS) * ROW_H }
  })
  return pos
}

/** Room under the slot for the label and the value pill, so the bottom clamp keeps both on screen. */
const ICON_FOOT = 64

/** Keep an icon on the desk — fully visible, never under the bar. */
function clampPos(x: number, y: number): Pos {
  return {
    x: Math.min(Math.max(x, 4), window.innerWidth - ICON_W - 4),
    y: Math.min(Math.max(y, BAR_H + 4), window.innerHeight - ICON_SLOT - ICON_FOOT)
  }
}

/** Two icons closer than this read as overlapping. Roughly the icon's own footprint. */
const MIN_DIST = 112

function isFree(p: Pos, positions: Record<string, Pos>, ignoreId: string) {
  for (const [id, q] of Object.entries(positions)) {
    if (id !== ignoreId && Math.hypot(p.x - q.x, p.y - q.y) < MIN_DIST) return false
  }
  return true
}

/** The nearest clear spot to where the object wants to land: try the spot itself, then walk rings
 *  outward around it until a candidate has breathing room. Searching by growing radius means the first
 *  hit is (near enough) the closest. A desk too packed to have one just takes the overlap. */
function nearestFreeSpot(desired: Pos, positions: Record<string, Pos>, ignoreId: string): Pos {
  const d = clampPos(desired.x, desired.y)
  if (isFree(d, positions, ignoreId)) return d
  for (let r = MIN_DIST; r <= MIN_DIST * 6; r += MIN_DIST / 2) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const c = clampPos(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r)
      if (isFree(c, positions, ignoreId)) return c
    }
  }
  return d
}

// Momentum. A release still moving above FLING_MIN keeps its velocity and coasts, bleeding speed to
// exponential friction and bouncing (dampened) off the desk's edges; below it, a release is just a
// placement. Tuned by feel: a lazy drop stays put, a flick sails.
const FLING_MIN = 220 // px/s
const FLING_MAX = 3200 // px/s — a wild gesture shouldn't cross the desk twice
const FRICTION = 8.4 // 1/s exponential decay — doubled halves how long a throw coasts
const BOUNCE = 0.45 // energy kept on an edge hit
const REST = 40 // px/s — below this it has stopped

/** The wallpaper choices behind "Change Wallpaper ▸". CSS backgrounds, so they cost nothing. */
const WALLPAPERS = [
  { label: "Graphite", css: "var(--background)" },
  { label: "Midnight", css: "radial-gradient(120% 110% at 50% 0%, #16203a 0%, #0d1017 70%)" },
  { label: "Aurora", css: "linear-gradient(160deg, #101418 0%, #0e1f1c 55%, #1c1420 100%)" },
  { label: "Ember", css: "radial-gradient(110% 120% at 85% 100%, #2a1712 0%, #131315 60%)" }
] as const

export function DesktopWorkspace() {
  // refs
  const rootRef = useRef<HTMLDivElement>(null)
  const idc = useRef(0)
  const assetIdc = useRef(0)
  const contactIdc = useRef(0)
  /** The icon wrapper nodes, for the drag and the fling to move without a render. */
  const iconNodes = useRef(new Map<string, HTMLElement>())
  /** Where the current coast has got to, so an interruption can park it in place. */
  const flingState = useRef<{ id: string; x: number; y: number } | null>(null)

  // state — assets divide and recombine; wallets rename, edit and delete; positions are the desk itself
  const [assets, setAssets] = useState<AssetObj[]>(ASSETS)
  const [contacts, setContacts] = useState<PersonObj[]>(PEOPLE)
  const [positions, setPositions] = useState<Record<string, Pos> | null>(null)
  const [wins, setWins] = useState<WinSpec[]>([])
  const [menu, setMenu] = useState<MenuSpec | null>(null)
  const [deskMenu, setDeskMenu] = useState<{ x: number; y: number } | null>(null)
  const [wallpaper, setWallpaper] = useState<(typeof WALLPAPERS)[number]>(WALLPAPERS[1])
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // drag
  const { obj: dragged, over } = useDrag()

  // data — one flat list feeds the canvas and the hover readout; position is per-icon layout
  const deskItems: DesktopObj[] = [...assets, ...contacts]
  const draggedAsset = dragged?.class === "asset" ? dragged : null

  // events — window manager (centered modals)
  const close = (id: string) => setWins((w) => w.filter((x) => x.id !== id))
  const open = useCallback((spec: WinDraft) => {
    setWins((w) => {
      const ex = w.find((x) => x.matchKey === spec.matchKey)
      if (ex) return [...w.filter((x) => x !== ex), ex]
      return [...w, { ...spec, id: `w${idc.current++}` } as WinSpec]
    })
  }, [])
  const onSettle = useCallback((receipt: Receipt) => open({ kind: "receipt", receipt, matchKey: receipt.id }), [open])
  const noop = useCallback(() => {}, [])

  // events — placement. Letting go over nothing IS the placement gesture; (x, y) is the cursor, which
  // carried the coin's centre, so the icon lands with its slot centred there. A release still moving
  // keeps its velocity and coasts to rest.
  //
  // The coast runs as the canvas's frame task, writing the icon's DOM position directly right before
  // the coins are measured — label and coin then read the same frame. Its own requestAnimationFrame
  // would land *after* that measurement, and the coin would trail the label by one step all the way.
  // State only hears about it when the flight ends (or is interrupted), via the commit below.

  /** Park the in-flight icon exactly where its coast has taken it so far. */
  const stopFling = () => {
    const f = flingState.current
    flingState.current = null
    setCoinFrameTask(null)
    if (f) setPositions((pos) => (pos ? { ...pos, [f.id]: nearestFreeSpot({ x: f.x, y: f.y }, pos, f.id) } : pos))
  }

  const flingObject = (id: string, from: Pos, vx: number, vy: number) => {
    let { x, y } = from
    // cap the speed, preserving direction
    const cap = Math.min(1, FLING_MAX / Math.hypot(vx, vy))
    let vX = vx * cap
    let vY = vy * cap

    const step = (dt: number) => {
      x += vX * dt
      y += vY * dt
      const decay = Math.exp(-FRICTION * dt)
      vX *= decay
      vY *= decay

      // dampened bounce off the desk's edges
      const minX = 4
      const maxX = window.innerWidth - ICON_W - 4
      const minY = BAR_H + 4
      const maxY = window.innerHeight - ICON_SLOT - ICON_FOOT
      if (x < minX || x > maxX) {
        x = Math.min(Math.max(x, minX), maxX)
        vX = -vX * BOUNCE
      }
      if (y < minY || y > maxY) {
        y = Math.min(Math.max(y, minY), maxY)
        vY = -vY * BOUNCE
      }

      if (Math.hypot(vX, vY) > REST) {
        flingState.current = { id, x, y }
        const el = iconNodes.current.get(id)
        if (el) {
          el.style.left = `${x}px`
          el.style.top = `${y}px`
        }
      } else {
        // mid-flight it just flies over everything; coming to rest is a placement, so it settles into
        // the nearest clear spot like any other drop
        stopFling()
      }
    }
    flingState.current = { id, x, y }
    setCoinFrameTask(step)
  }

  const moveObject = (obj: DesktopObj, x: number, y: number, vx: number, vy: number) => {
    stopFling()
    const p = clampPos(x - ICON_W / 2, y - ICON_PAD - ICON_SLOT / 2)
    if (Math.hypot(vx, vy) >= FLING_MIN) {
      // launch from the raw drop point — collision resolution happens where it lands, not where it left
      setPositions((pos) => (pos ? { ...pos, [obj.id]: p } : pos))
      flingObject(obj.id, p, vx, vy)
    } else {
      setPositions((pos) => (pos ? { ...pos, [obj.id]: nearestFreeSpot(p, pos, obj.id) } : pos))
    }
  }

  // events — asset actions
  const startSplit = (asset: AssetObj) => open({ kind: "split", asset, matchKey: `split-${asset.id}` })
  const startCombine = (a: AssetObj, b: AssetObj) =>
    // order-independent key, so dropping A on B and B on A raise the same window rather than two
    open({ kind: "combine", a, b, matchKey: `combine-${[a.id, b.id].sort().join("-")}` })

  /** Divide an object: the original survives — same id, same spot — and a clone lands just beside it.
   *  Value is proportional; a split moves nothing, it only divides what's already held. */
  const splitAsset = (asset: AssetObj, portion: number) => {
    const cloneId = `${asset.id}-s${assetIdc.current++}`
    const rate = asset.usd / asset.balance
    const kept = asset.balance - portion

    setAssets((list) => {
      const i = list.findIndex((a) => a.id === asset.id)
      if (i < 0) return list
      const original: AssetObj = { ...asset, balance: kept, usd: kept * rate }
      const clone: AssetObj = { ...asset, id: cloneId, balance: portion, usd: portion * rate }
      return [...list.slice(0, i), original, clone, ...list.slice(i + 1)]
    })
    setPositions((pos) => {
      const at = pos?.[asset.id]
      if (!pos || !at) return pos
      return { ...pos, [cloneId]: nearestFreeSpot({ x: at.x + COL_W * 0.6, y: at.y + ROW_H * 0.25 }, pos, cloneId) }
    })
  }

  /** Pour two portions back into one. The merged object takes the target's spot — that's the coin the
   *  other was poured into. Value is additive; the holding is identical either side of a combine. */
  const combineAssets = (a: AssetObj, b: AssetObj) => {
    const mergedId = `${a.id}-c${assetIdc.current++}`
    setAssets((list) => {
      const ia = list.findIndex((x) => x.id === a.id)
      const ib = list.findIndex((x) => x.id === b.id)
      if (ia < 0 || ib < 0) return list
      const merged: AssetObj = { ...a, id: mergedId, balance: a.balance + b.balance, usd: a.usd + b.usd }
      const rest = list.filter((x) => x.id !== a.id && x.id !== b.id)
      const at = Math.min(ia, ib)
      return [...rest.slice(0, at), merged, ...rest.slice(at)]
    })
    setPositions((pos) => {
      if (!pos) return pos
      const { [a.id]: posA, [b.id]: posB, ...rest } = pos
      return { ...rest, [mergedId]: posB ?? posA }
    })
  }

  // events — wallet actions
  const renameContact = (id: string, name: string) => {
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, label: name } : c)))
    setRenamingId(null)
  }
  const saveContact = (id: string, patch: Pick<PersonObj, "label" | "handle" | "address">) =>
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const deleteContact = (id: string) => {
    setContacts((list) => list.filter((c) => c.id !== id))
    setPositions((pos) => {
      if (!pos) return pos
      const { [id]: gone, ...rest } = pos
      void gone
      return rest
    })
    // an edit window for a wallet that no longer exists would save into nothing — take it down with it
    setWins((w) => w.filter((x) => x.kind !== "contact" || x.contact.id !== id))
  }

  // events — drops. An asset on a wallet opens the transfer modal, which asks Send or Trade before the
  // details; an asset on a matching portion recombines; a wallet on the trash asks before deleting —
  // the gesture is too close to an ordinary move to be allowed to destroy anything on its own.
  const onDrop = (obj: DesktopObj, dropKey: string) => {
    // the icon was carried to the drop point and can't stay ON its target — settle it beside, with the
    // same push-away any overlapping placement gets
    const p = clampPos(coinView.cursor.x - ICON_W / 2, coinView.cursor.y - ICON_PAD - ICON_SLOT / 2)
    setPositions((pos) => (pos ? { ...pos, [obj.id]: nearestFreeSpot(p, pos, obj.id) } : pos))

    if (obj.class === "person") {
      if (dropKey === TRASH_DROP_KEY) open({ kind: "delete-contact", contact: obj, matchKey: `delete-${obj.id}` })
      return
    }
    const walletId = walletDropId(dropKey)
    if (walletId) {
      const to = contacts.find((c) => c.id === walletId)
      if (to) open({ kind: "transfer", asset: obj, to, matchKey: `transfer-${obj.id}-${to.id}` })
      return
    }
    const targetId = assetDropId(dropKey)
    if (targetId) {
      const target = assets.find((x) => x.id === targetId)
      if (target && canCombine(obj, target)) startCombine(obj, target)
    }
  }
  /** Sit the icon so its slot is centred on (cx, cy) — the drag and the fling both speak cursor. */
  const placeNode = (id: string, cx: number, cy: number) => {
    const el = iconNodes.current.get(id)
    if (!el) return
    el.style.left = `${cx - ICON_W / 2}px`
    el.style.top = `${cy - ICON_PAD - ICON_SLOT / 2}px`
  }
  const { onPointerDown } = useDesktopDrag({ onDrop, onMove: moveObject, onDragMove: (obj, x, y) => placeNode(obj.id, x, y) })
  // grabbing anything catches whatever is still coasting — two things can't be in motion at once
  const onIconPress = (obj: DesktopObj) => {
    const press = onPointerDown(obj)
    return (e: React.PointerEvent) => {
      stopFling()
      press(e)
    }
  }

  // events — desk housekeeping (the desktop's own right-click menu)
  const cleanUp = (assetOrder = assets, contactOrder = contacts) => setPositions(defaultPositions(assetOrder, contactOrder, window.innerWidth))
  const cleanUpBy = (key: "name" | "kind" | "value") => {
    const byName = (a: DesktopObj, b: DesktopObj) => a.label.localeCompare(b.label)
    const sorted = [...assets].sort(
      key === "name" ? byName : key === "value" ? (a, b) => b.usd - a.usd : (a, b) => a.kind.localeCompare(b.kind) || b.usd - a.usd
    )
    // only "Name" says anything about wallets; the other keys are asset-shaped
    cleanUp(sorted, key === "name" ? [...contacts].sort(byName) : contacts)
  }

  /** A fresh wallet starts as a draft in the new-contact window — nothing lands on the desk unless
   *  it's saved, so closing the window leaves no orphan icon behind. */
  const addContact = (at: Pos) => {
    const draft: PersonObj = {
      id: `p-new-${contactIdc.current++}`,
      class: "person",
      label: "New Contact",
      handle: "unconfirmed",
      trust: "unconfirmed",
      hue: Math.floor(Math.random() * 360),
      chain: CONNECTED_NETWORK
    }
    open({ kind: "new-contact", draft, at, matchKey: "new-contact" })
  }
  const createContact = (draft: PersonObj, patch: Pick<PersonObj, "label" | "handle" | "address">, at: Pos) => {
    const contact = { ...draft, ...patch }
    setContacts((list) => [...list, contact])
    setPositions((pos) => {
      if (!pos) return pos
      const p = clampPos(at.x - ICON_W / 2, at.y - ICON_PAD - ICON_SLOT / 2)
      return { ...pos, [contact.id]: nearestFreeSpot(p, pos, contact.id) }
    })
  }

  // events — right-click. Icons take their own menu; the desk itself takes housekeeping. An NFT has
  // nothing to split, so it gets nothing (the browser menu is suppressed either way — this is a
  // desktop, not a document).
  const onIconMenu = (obj: DesktopObj) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // the desk's own menu listens underneath
    setDeskMenu(null)
    if (obj.class === "asset" && !isSplittable(obj)) return
    setMenu({ x: e.clientX, y: e.clientY, obj })
  }
  const onDeskMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(null)
    setDeskMenu({ x: e.clientX, y: e.clientY })
  }

  const menuItems = (obj: DesktopObj): DesktopMenuItem[] =>
    obj.class === "asset"
      ? [{ label: "Split", onSelect: () => startSplit(obj) }]
      : [
          { label: "Rename", onSelect: () => setRenamingId(obj.id) },
          { label: "Edit", onSelect: () => open({ kind: "contact", contact: obj, matchKey: `contact-${obj.id}` }) },
          // same confirm as the trash — permanent is permanent, whichever gesture asked
          { label: "Delete", danger: true, onSelect: () => open({ kind: "delete-contact", contact: obj, matchKey: `delete-${obj.id}` }) }
        ]
  const deskMenuItems = (at: Pos): DesktopMenuItem[] => [
    { label: "New Contact", onSelect: () => addContact(at) },
    {
      label: "Change Wallpaper",
      children: WALLPAPERS.map((w) => ({ label: w.label, checked: w.label === wallpaper.label, onSelect: () => setWallpaper(w) }))
    },
    { label: "Clean Up", separator: true, onSelect: () => cleanUp() },
    {
      label: "Clean Up By",
      children: [
        { label: "Name", onSelect: () => cleanUpBy("name") },
        { label: "Kind", onSelect: () => cleanUpBy("kind") },
        { label: "Value", onSelect: () => cleanUpBy("value") }
      ]
    }
  ]

  // effects — the desktop is the surface the resting objects clip to
  useEffect(() => {
    if (!rootRef.current) return
    return registerCoinViewport(rootRef.current)
  }, [])

  // effects — the starting arrangement needs the viewport's width, which the server doesn't have
  useEffect(() => {
    setPositions(defaultPositions(ASSETS, PEOPLE, window.innerWidth))
  }, [])

  // effects — don't let a coasting icon outlive the desk
  useEffect(() => stopFling, [])

  // effects — the dragged icon is positioned imperatively, and any re-render mid-drag (targets
  // lighting, dimming) resets its wrapper to the stale state position. Re-pin it after every render,
  // before paint, so the stale value never shows.
  useLayoutEffect(() => {
    if (dragged) placeNode(dragged.id, coinView.cursor.x, coinView.cursor.y)
  })

  return (
    <>
      <DesktopBar totalUsd={assets.reduce((t, a) => t + a.usd, 0)} />

      {/* icon positions are viewport coordinates, so this layer must be the viewport — offsetting it
          (say, below the bar) would land every drop that offset away from the cursor. The clamp is what
          keeps icons out from under the bar, not the container. It also wears the wallpaper and owns
          the desk's own right-click menu. */}
      <div ref={rootRef} className="absolute inset-0" style={{ background: wallpaper.css }} onContextMenu={onDeskMenu}>
        {positions &&
          assets.map((a) => {
            const p = positions[a.id]
            if (!p) return null
            return (
              <div
                key={a.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(a.id, el)
                  else iconNodes.current.delete(a.id)
                }}
                // in hand: above everything on the desk, and pointer-transparent so the drop
                // hit-testing sees the zones underneath rather than the icon being carried
                className={cn("absolute", dragged?.id === a.id && "pointer-events-none z-[70]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopIcon
                  obj={a}
                  label={desktopLabel(a)}
                  // only a valid merge target carries a drop key, so a drop can never land where it can't resolve
                  dropKey={draggedAsset && canCombine(draggedAsset, a) ? assetDropKey(a.id) : undefined}
                  dimmed={!!draggedAsset && !isSameToken(draggedAsset, a)}
                  target={!!draggedAsset && canCombine(draggedAsset, a)}
                  over={!!draggedAsset && over === assetDropKey(a.id)}
                  anyDragging={!!dragged}
                  onPointerDown={onIconPress(a)}
                  onContextMenu={onIconMenu(a)}
                />
              </div>
            )
          })}

        {positions &&
          contacts.map((c) => {
            const p = positions[c.id]
            if (!p) return null
            return (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(c.id, el)
                  else iconNodes.current.delete(c.id)
                }}
                className={cn("absolute", dragged?.id === c.id && "pointer-events-none z-[70]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopIcon
                  obj={c}
                  label={desktopLabel(c)}
                  dropKey={walletDropKey(c.id)}
                  target={!!draggedAsset}
                  over={!!draggedAsset && over === walletDropKey(c.id)}
                  anyDragging={!!dragged}
                  renaming={renamingId === c.id}
                  onRename={(name) => renameContact(c.id, name)}
                  onRenameCancel={() => setRenamingId(null)}
                  onPointerDown={onIconPress(c)}
                  onContextMenu={onIconMenu(c)}
                />
              </div>
            )
          })}

        <DesktopTrash armed={dragged?.class === "person"} over={over === TRASH_DROP_KEY} />
      </div>

      {/* the 3D objects — draws into the slots the icons above registered */}
      <ObjectScene items={deskItems} />

      {/* modals */}
      {wins.map((w, i) => {
        const z = 200 + i
        if (w.kind === "transfer")
          return <TransferWindow key={w.id} asset={w.asset} to={w.to} z={z} onClose={() => close(w.id)} onSettle={onSettle} onLog={noop} />
        if (w.kind === "split") return <SplitWindow key={w.id} asset={w.asset} z={z} onClose={() => close(w.id)} onSplit={(p) => splitAsset(w.asset, p)} />
        if (w.kind === "combine")
          return <CombineWindow key={w.id} a={w.a} b={w.b} z={z} onClose={() => close(w.id)} onCombine={() => combineAssets(w.a, w.b)} />
        if (w.kind === "contact")
          return <ContactWindow key={w.id} contact={w.contact} z={z} onClose={() => close(w.id)} onSave={(patch) => saveContact(w.contact.id, patch)} />
        if (w.kind === "new-contact")
          return <ContactWindow key={w.id} contact={w.draft} create z={z} onClose={() => close(w.id)} onSave={(patch) => createContact(w.draft, patch, w.at)} />
        if (w.kind === "delete-contact")
          return <DeleteWindow key={w.id} contact={w.contact} z={z} onClose={() => close(w.id)} onConfirm={() => deleteContact(w.contact.id)} />
        return <ReceiptWindow key={w.id} receipt={w.receipt} z={z} onClose={() => close(w.id)} />
      })}

      {/* the right-click menus — an icon's own, or the desk's housekeeping */}
      {menu && <DesktopMenu x={menu.x} y={menu.y} items={menuItems(menu.obj)} onClose={() => setMenu(null)} />}
      {deskMenu && <DesktopMenu x={deskMenu.x} y={deskMenu.y} items={deskMenuItems(deskMenu)} onClose={() => setDeskMenu(null)} />}

      <ObjectHoverInfo items={deskItems} />
    </>
  )
}
