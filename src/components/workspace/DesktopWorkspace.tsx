"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { ArrowDownUp, FolderPlus, Image as ImageIcon, LayoutGrid, Pencil, Scissors, Search, SquarePen, Trash2, UserPlus } from "lucide-react"

import {
  assetDropId,
  assetDropKey,
  canCombine,
  folderDropId,
  folderDropKey,
  isSameToken,
  isSplittable,
  navDropId,
  navDropKey,
  walletDropId,
  walletDropKey
} from "@/lib/asset-ops"
import { coinView, registerCoinViewport, setCoinHover } from "@/lib/coin-store"
import { ASSETS, CONNECTED_NETWORK, DUST_ASSETS, DUST_NFTS, NAV_ITEMS, PEOPLE } from "@/lib/data"
import { endDrag, setOver, startGroupDrag, useDrag } from "@/lib/drag-store"
import type { AssetObj, DesktopObj, PersonObj, Receipt } from "@/lib/types"
import { cn, desktopLabel } from "@/lib/utils"

import { CHROME_KEEPOUT_H, CHROME_KEEPOUT_W, DesktopBar } from "../desktop/DesktopBar"
import { DOCK_GAP, DOCK_H, DOCK_W, DesktopDock, dropTileAt } from "../desktop/DesktopDock"
import { DesktopFolder } from "../desktop/DesktopFolder"
import { DesktopIcon, ICON_PAD, ICON_SLOT, ICON_W } from "../desktop/DesktopIcon"
import { DesktopMenu, type DesktopMenuItem } from "../desktop/DesktopMenu"
import { useDesktopDrag } from "../desktop/useDesktopDrag"
import { ObjectHoverInfo } from "../shell/ObjectHoverInfo"
import { CombineWindow } from "../windows/CombineWindow"
import { ContactWindow } from "../windows/ContactWindow"
import { DeleteWindow } from "../windows/DeleteWindow"
import { FolderWindow } from "../windows/FolderWindow"
import { ReceiptWindow } from "../windows/ReceiptWindow"
import { SplitWindow } from "../windows/SplitWindow"
import { TransferWindow } from "../windows/TransferWindow"

// The desktop. Floating chrome over the wallpaper — greeting and balance card up top, the app dock
// along the bottom; between them every object sits wherever it was last put — holdings start in
// columns on the left, wallets on the right, and dragging anywhere just places the icon
// exactly where it's released. Everything happens on the objects themselves:
// hover to inspect, drop a holding on a wallet to act on it (the transfer modal asks Send or Trade),
// drop onto a matching portion to combine, right-click for the object's own menu (Split on a token;
// Rename / Edit / Delete on a wallet). The desk itself right-clicks to housekeeping: New Contact,
// Change Wallpaper, Clean Up, Clean Up By.

// WebGL can't render on the server, and the coin faces are drawn to a 2D canvas at material-build time.
const ObjectScene = dynamic(() => import("../canvas/ObjectScene").then((m) => m.ObjectScene), { ssr: false })

type WinBody =
  | { kind: "transfer"; assets: AssetObj[]; to: PersonObj }
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

// The default arrangement, straight from the design: assets in columns of 5 filled top-to-bottom from
// the left edge (the Other Tokens folder takes the slot after the last asset), contacts in rows of 3
// anchored top-right under the balance card. Only the starting point; every drag rewrites it.
const EDGE = 32
const TOP = 192 // clears the greeting block top-left and the balance card top-right
const ROWS = 5
const COL_W = 97
const ROW_H = 112
/** The slot sits centred in the icon's wrapper; layout speaks slot edges, positions speak wrappers. */
const SLOT_INSET = (ICON_W - ICON_SLOT) / 2
const CONTACT_COLS = 3

/** The Other Tokens folder's desk id. */
export const FOLDER_ID = "folder-other"

/** A desk folder: a name and the ids it holds. Objects in a folder stay in the flat asset/contact
 *  lists — the desk simply doesn't show them, so pulling one out is just removing its id here. */
type FolderSpec = { id: string; label: string; contents: string[] }

/** First run: the token dust lives in Other Tokens, the NFT dust in Other NFTs. A module constant so
 *  the initial layout effect can lay out the desk without depending on folder state. */
const INITIAL_FOLDERS: FolderSpec[] = [
  { id: FOLDER_ID, label: "Other tokens", contents: DUST_ASSETS.map((a) => a.id) },
  { id: "folder-other-nfts", label: "Other NFTs", contents: DUST_NFTS.map((a) => a.id) }
]

function defaultPositions(assets: AssetObj[], contacts: PersonObj[], folderIds: string[], width: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {}
  const assetSlot = (i: number): Pos => ({ x: EDGE - SLOT_INSET + Math.floor(i / ROWS) * COL_W, y: TOP + (i % ROWS) * ROW_H })
  assets.forEach((a, i) => {
    pos[a.id] = assetSlot(i)
  })
  folderIds.forEach((fid, i) => {
    pos[fid] = assetSlot(assets.length + i)
  })
  contacts.forEach((c, i) => {
    const row = Math.floor(i / CONTACT_COLS)
    const col = i % CONTACT_COLS
    pos[c.id] = { x: width - EDGE - ICON_SLOT - SLOT_INSET - (CONTACT_COLS - 1 - col) * COL_W, y: TOP + row * ROW_H }
  })
  return pos
}

/** Room under the slot for the label and the value pill, so the bottom clamp keeps both on screen. */
const ICON_FOOT = 64

/** Keep an icon on the desk — fully visible edge to edge (the chrome floats; nothing owns a strip),
 *  and never under the pieces of chrome that sit above the icon layer (the dock shelf, the top-right
 *  toggles + balance card): an icon parked beneath those could never be picked back up through them.
 *  Anything landing there steps clear. */
function clampPos(x: number, y: number): Pos {
  const cx = Math.min(Math.max(x, 4), window.innerWidth - ICON_W - 4)
  let cy = Math.min(Math.max(y, 4), window.innerHeight - ICON_SLOT - ICON_FOOT)

  const dockTop = window.innerHeight - DOCK_GAP - DOCK_H
  const dockLeft = (window.innerWidth - DOCK_W) / 2
  const overlapsDock = cx + ICON_W > dockLeft - 4 && cx < dockLeft + DOCK_W + 4 && cy + ICON_SLOT + ICON_FOOT > dockTop
  if (overlapsDock) cy = dockTop - ICON_SLOT - ICON_FOOT

  const overlapsChrome = cx + ICON_W > window.innerWidth - CHROME_KEEPOUT_W && cy < CHROME_KEEPOUT_H
  if (overlapsChrome) cy = CHROME_KEEPOUT_H

  return { x: cx, y: cy }
}

/** Two icons closer than this read as overlapping. Roughly the icon's own footprint. */
const MIN_DIST = 100

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

/** The wallpaper choices behind "Change Wallpaper ▸" — the design's two gradient images. */
const WALLPAPERS = [
  { label: "Dusk", css: "#000014 url(/images/bg.png) center / cover no-repeat" },
  { label: "Sea", css: "#000a10 url(/images/bg2.png) center / cover no-repeat" }
] as const

export function DesktopWorkspace() {
  // refs
  const rootRef = useRef<HTMLDivElement>(null)
  const idc = useRef(0)
  const assetIdc = useRef(0)
  const contactIdc = useRef(0)
  const folderIdc = useRef(0)
  /** The icon wrapper nodes, for the drag to move without a render. */
  const iconNodes = useRef(new Map<string, HTMLElement>())
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // state — assets divide and recombine; wallets rename, edit and delete; positions are the desk itself
  const [assets, setAssets] = useState<AssetObj[]>([...ASSETS, ...DUST_ASSETS, ...DUST_NFTS])
  const [contacts, setContacts] = useState<PersonObj[]>(PEOPLE)
  const [folders, setFolders] = useState<FolderSpec[]>(INITIAL_FOLDERS)
  /** Which folder windows are open — order is stacking order, last on top. */
  const [folderWins, setFolderWins] = useState<string[]>([])
  const [positions, setPositions] = useState<Record<string, Pos> | null>(null)
  const [wins, setWins] = useState<WinSpec[]>([])
  const [menu, setMenu] = useState<MenuSpec | null>(null)
  const [deskMenu, setDeskMenu] = useState<{ x: number; y: number } | null>(null)
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [wallpaper, setWallpaper] = useState<(typeof WALLPAPERS)[number]>(WALLPAPERS[0])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  /** Multi-select: the ids swept up by the marquee. Dragging any of them moves the whole set. */
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  /** The two halves of the freshest split — they flare yellow on the desk until the flash fades. */
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  // drag — one object in hand, or a carried multi-selection; the store treats both as "dragging"
  const { obj: dragged, carriedIds, over } = useDrag()

  // data — what's ON the desk is everything not filed in a folder; the flat lists keep everything
  const folderedIds = new Set(folders.flatMap((f) => f.contents))
  const allItems: DesktopObj[] = [...assets, ...contacts]
  const deskItems: DesktopObj[] = allItems.filter((o) => !folderedIds.has(o.id))
  const draggedAsset = dragged?.class === "asset" ? dragged : null
  const carriedHasAsset = !!carriedIds && assets.some((a) => carriedIds.has(a.id))
  /** Whether the carry holds anything a folder could take — folders themselves never file. */
  const carriedHasFilable = !!carriedIds && [...carriedIds].some((id) => !folders.some((f) => f.id === id))
  const anyDragging = !!dragged || !!carriedIds

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

  // events — placement. Letting go IS the placement gesture; (x, y) is the cursor, which carried the
  // coin's centre, so the icon lands with its slot centred there (pushed aside if something's already
  // sitting there).
  const moveObject = (obj: DesktopObj, x: number, y: number) => {
    const p = clampPos(x - ICON_W / 2, y - ICON_PAD - ICON_SLOT / 2)
    setPositions((pos) => (pos ? { ...pos, [obj.id]: nearestFreeSpot(p, pos, obj.id) } : pos))
  }

  // events — asset actions
  const startSplit = (asset: AssetObj) => open({ kind: "split", asset, matchKey: `split-${asset.id}` })
  const startCombine = (a: AssetObj, b: AssetObj) =>
    // order-independent key, so dropping A on B and B on A raise the same window rather than two
    open({ kind: "combine", a, b, matchKey: `combine-${[a.id, b.id].sort().join("-")}` })

  /** Divide an object: the original survives — same id, same spot — and a clone lands just beside it.
   *  Value is proportional; a split moves nothing, it only divides what's already held. A split inside
   *  a folder stays inside it: the clone files itself next to the original rather than taking a desk
   *  slot (it gets one the day it's pulled out, like anything else filed). */
  const splitAsset = (asset: AssetObj, portion: number) => {
    const cloneId = `${asset.id}-s${assetIdc.current++}`
    const rate = asset.usd / asset.balance
    const kept = asset.balance - portion
    const home = folders.find((f) => f.contents.includes(asset.id))

    setAssets((list) => {
      const i = list.findIndex((a) => a.id === asset.id)
      if (i < 0) return list
      const original: AssetObj = { ...asset, balance: kept, usd: kept * rate }
      const clone: AssetObj = { ...asset, id: cloneId, balance: portion, usd: portion * rate }
      return [...list.slice(0, i), original, clone, ...list.slice(i + 1)]
    })
    if (home) {
      setFolders((list) =>
        list.map((f) => {
          if (f.id !== home.id) return f
          const at = f.contents.indexOf(asset.id)
          return { ...f, contents: [...f.contents.slice(0, at + 1), cloneId, ...f.contents.slice(at + 1)] }
        })
      )
    } else {
      setPositions((pos) => {
        const at = pos?.[asset.id]
        if (!pos || !at) return pos
        return { ...pos, [cloneId]: nearestFreeSpot({ x: at.x + COL_W * 0.6, y: at.y + ROW_H * 0.25 }, pos, cloneId) }
      })
    }
    // both halves flare — the clone that just landed, and the original it was cut from. The timeout
    // only clears state after the CSS flash has already faded to nothing.
    setFlashIds(new Set([asset.id, cloneId]))
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashIds(new Set()), 2100)
  }

  /** Pour two portions back into one. The merged object takes the target's spot — that's the coin the
   *  other was poured into. Value is additive; the holding is identical either side of a combine.
   *  A combine inside a folder stays inside it: the merged coin takes the target's slot in the
   *  contents and holds no desk position until it's pulled out. */
  const combineAssets = (a: AssetObj, b: AssetObj) => {
    const mergedId = `${a.id}-c${assetIdc.current++}`
    const filed = folders.some((f) => f.contents.includes(a.id) || f.contents.includes(b.id))
    setAssets((list) => {
      const ia = list.findIndex((x) => x.id === a.id)
      const ib = list.findIndex((x) => x.id === b.id)
      if (ia < 0 || ib < 0) return list
      const merged: AssetObj = { ...a, id: mergedId, balance: a.balance + b.balance, usd: a.usd + b.usd }
      const rest = list.filter((x) => x.id !== a.id && x.id !== b.id)
      const at = Math.min(ia, ib)
      return [...rest.slice(0, at), merged, ...rest.slice(at)]
    })
    if (filed) {
      setFolders((list) =>
        list.map((f) => {
          if (!f.contents.includes(a.id) && !f.contents.includes(b.id)) return f
          // the merged coin takes the target's slot; if only the poured half was filed, it takes that one
          const swapped = f.contents.map((cid) => (cid === b.id ? mergedId : cid))
          return {
            ...f,
            contents: swapped.includes(mergedId) ? swapped.filter((cid) => cid !== a.id) : swapped.map((cid) => (cid === a.id ? mergedId : cid))
          }
        })
      )
    }
    setPositions((pos) => {
      if (!pos) return pos
      const { [a.id]: posA, [b.id]: posB, ...rest } = pos
      if (filed) return rest
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

    // a folder takes anything except another folder — filed away, off the desk
    const intoFolder = folderDropId(dropKey)
    if (intoFolder) {
      setFolders((list) => list.map((f) => (f.id === intoFolder && !f.contents.includes(obj.id) ? { ...f, contents: [...f.contents, obj.id] } : f)))
      return
    }
    // beyond folders, a wallet drag recognises no zones (deleting lives in its menu) — it only lands
    if (obj.class === "person") return
    // a dock app took the drop. The interaction itself arrives with the dock features; today the drop
    // lands cleanly and the icon has already stepped back off the shelf (the placement clamp above).
    if (navDropId(dropKey)) return
    const walletId = walletDropId(dropKey)
    if (walletId) {
      const to = contacts.find((c) => c.id === walletId)
      if (to) open({ kind: "transfer", assets: [obj], to, matchKey: `transfer-${obj.id}-${to.id}` })
      return
    }
    const targetId = assetDropId(dropKey)
    if (targetId) {
      const target = assets.find((x) => x.id === targetId)
      if (target && canCombine(obj, target)) {
        // a filed tile takes the drop too — the coin files itself in beside its target first, so
        // cancelling the combine leaves it in the folder rather than stranded under the window
        const home = folders.find((f) => f.contents.includes(target.id))
        if (home)
          setFolders((list) => list.map((f) => (f.id === home.id && !f.contents.includes(obj.id) ? { ...f, contents: [...f.contents, obj.id] } : f)))
        startCombine(obj, target)
      }
    }
  }
  /** Sit the icon so its slot is centred on (cx, cy) — the drag speaks cursor. */
  const placeNode = (id: string, cx: number, cy: number) => {
    const el = iconNodes.current.get(id)
    if (!el) return
    el.style.left = `${cx - ICON_W / 2}px`
    el.style.top = `${cy - ICON_PAD - ICON_SLOT / 2}px`
  }
  const { onPointerDown } = useDesktopDrag({ onDrop, onMove: moveObject, onDragMove: (obj, x, y) => placeNode(obj.id, x, y) })

  // events — marquee select. Starts only on the desk itself (a press on an icon is a pick-up, not a
  // sweep), draws the box, and re-derives the selection from whichever icons it crosses. The coins
  // need nothing: they follow their slots whatever moves them.
  const onDeskPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== rootRef.current || !positions) return
    const sx = e.clientX
    const sy = e.clientY
    // folders sweep up too — a selection is for organising, and folders are furniture worth moving
    const boxes = [...deskItems.map((o) => ({ id: o.id, p: positions[o.id] })), ...folders.map((f) => ({ id: f.id, p: positions[f.id] }))].filter(
      (b): b is { id: string; p: Pos } => !!b.p
    )
    setSelectedIds(new Set())

    const onSweep = (ev: PointerEvent) => {
      const x0 = Math.min(sx, ev.clientX)
      const y0 = Math.min(sy, ev.clientY)
      const x1 = Math.max(sx, ev.clientX)
      const y1 = Math.max(sy, ev.clientY)
      setMarquee({ x0: sx, y0: sy, x1: ev.clientX, y1: ev.clientY })
      setSelectedIds(new Set(boxes.filter(({ p }) => p.x < x1 && p.x + ICON_W > x0 && p.y < y1 && p.y + ICON_SLOT + ICON_FOOT > y0).map(({ id }) => id)))
    }
    const onLift = () => {
      window.removeEventListener("pointermove", onSweep)
      window.removeEventListener("pointerup", onLift)
      setMarquee(null)
    }
    window.addEventListener("pointermove", onSweep)
    window.addEventListener("pointerup", onLift)
  }

  /** Carry a set of objects as one handful — the engine behind desk multi-selections AND folder
   *  pull-outs. Every carried wrapper rides the same delta, imperatively (the coins follow their
   *  slots), and the carry registers with the drag store so the scene, the badges and the hover
   *  readout treat it exactly like a single drag. Targets are found by geometry or through the
   *  pointer-transparent carried icons: a dock drop tile, a folder (icon or open window — the whole
   *  handful files itself), or a contact (one cascaded transfer flow). Otherwise it's a move: desk
   *  selections keep their formation; a stack pulled from a folder spreads out as it lands. */
  const startCarry =
    (ids: string[], opts: { settle: "formation" | "spread"; materialize?: (x: number, y: number) => Map<string, Pos> }) => (e: React.PointerEvent) => {
      if (e.button !== 0 || !positions) return
      const sx = e.clientX
      const sy = e.clientY
      const hasAsset = ids.some((id) => assets.some((a) => a.id === id))
      // folders ride along for organising, but they can never be filed or dropped INTO anything —
      // a carry of nothing but folders sees no targets at all
      const folderIdSet = new Set(folders.map((f) => f.id))
      const hasFilable = ids.some((id) => !folderIdSet.has(id))
      let started = false
      let origins: Map<string, Pos> | null = null
      if (!opts.materialize) {
        origins = new Map()
        for (const id of ids) {
          const p = positions[id]
          if (p) origins.set(id, p)
        }
      }

      /** The contact under (x, y), if any — found by geometry. Filed or carried contacts can't be hit. */
      const contactAt = (x: number, y: number) =>
        contacts.find((c) => {
          if (ids.includes(c.id) || folderedIds.has(c.id)) return false
          const p = positions[c.id]
          return !!p && x >= p.x && x <= p.x + ICON_W && y >= p.y && y <= p.y + ICON_SLOT + ICON_FOOT
        })

      /** The folder under (x, y) — the desk icon by geometry, or an open folder window through the
       *  DOM (the carried icons are pointer-transparent, so elementFromPoint sees past them). A folder
       *  that's itself being carried can't be its own target. */
      const folderAt = (x: number, y: number): string | null => {
        if (!hasFilable) return null
        const icon = folders.find((f) => {
          if (ids.includes(f.id)) return false
          const p = positions[f.id]
          return !!p && x >= p.x && x <= p.x + ICON_W && y >= p.y && y <= p.y + ICON_SLOT + ICON_FOOT
        })
        if (icon) return icon.id
        const key = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-drop]")?.getAttribute("data-drop")
        const id = key ? folderDropId(key) : null
        return id && !ids.includes(id) ? id : null
      }

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - sx
        const dy = ev.clientY - sy
        if (!started && Math.hypot(dx, dy) < 6) return
        if (!started) {
          started = true
          setCoinHover(null) // the readout would ride under the carried set the whole way
          if (!origins) origins = opts.materialize?.(ev.clientX, ev.clientY) ?? new Map()
          startGroupDrag(new Set(origins.keys()))
        }
        const org = origins
        if (!org) return
        for (const [id, o] of org) {
          const el = iconNodes.current.get(id)
          if (!el) continue
          el.style.left = `${o.x + dx}px`
          el.style.top = `${o.y + dy}px`
        }
        // light the target underneath — the store bails on same values, so this is free while cruising
        const hitNav = hasAsset ? dropTileAt(ev.clientX, ev.clientY) : undefined
        const hitFolder = hitNav ? null : folderAt(ev.clientX, ev.clientY)
        const hitContact = hitNav || hitFolder || !hasAsset ? undefined : contactAt(ev.clientX, ev.clientY)
        setOver(hitNav ? navDropKey(hitNav.id) : hitFolder ? folderDropKey(hitFolder) : hitContact ? walletDropKey(hitContact.id) : null)
      }
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        endDrag()
        const org = origins
        if (!started || !org) return
        const dx = ev.clientX - sx
        const dy = ev.clientY - sy

        const hitNav = hasAsset ? dropTileAt(ev.clientX, ev.clientY) : undefined
        const hitFolder = hitNav ? null : folderAt(ev.clientX, ev.clientY)
        const hitContact = hitNav || hitFolder ? undefined : contactAt(ev.clientX, ev.clientY)

        // filed: the handful disappears into the folder — except any folders riding along, which can
        // never be filed and settle beside the target instead
        if (hitFolder) {
          const fileIds = [...org.keys()].filter((id) => !folderIdSet.has(id))
          setFolders((list) => list.map((f) => (f.id === hitFolder ? { ...f, contents: [...new Set([...f.contents, ...fileIds])] } : f)))
          const carriedFolders = [...org].filter(([id]) => folderIdSet.has(id))
          if (carriedFolders.length) {
            setPositions((pos) => {
              if (!pos) return pos
              const next = { ...pos }
              for (const [id, o] of carriedFolders) next[id] = nearestFreeSpot(clampPos(o.x + dx, o.y + dy), next, id)
              return next
            })
          }
          return
        }

        setPositions((pos) => {
          if (!pos) return pos
          const next = { ...pos }
          for (const [id, o] of org) {
            const at = clampPos(o.x + dx, o.y + dy)
            // a drop can't stay ON its target, and a pulled stack spreads out — otherwise formation holds
            next[id] = hitContact || opts.settle === "spread" ? nearestFreeSpot(at, next, id) : at
          }
          return next
        })

        if (hitContact) {
          // the whole handful cascades into ONE transfer window, not a stack of one-asset modals
          const dropped = [...org.keys()].map((id) => assets.find((a) => a.id === id)).filter((a): a is AssetObj => !!a)
          if (dropped.length) {
            const key = dropped
              .map((a) => a.id)
              .sort()
              .join("+")
            open({ kind: "transfer", assets: dropped, to: hitContact, matchKey: `transfer-${key}-${hitContact.id}` })
          }
        }
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    }

  /** A press on an icon: carried with its selection if it has one, an ordinary single drag (and the
   *  selection stands down) if not. */
  const onIconPointerDown = (obj: DesktopObj) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (selectedIds.has(obj.id) && selectedIds.size > 1) return startCarry([...selectedIds], { settle: "formation" })(e)
    if (selectedIds.size) setSelectedIds(new Set())
    onPointerDown(obj)(e)
  }

  // events — desk housekeeping (the desktop's own right-click menu). The last-used arrangement is
  // remembered so a window resize can re-run it: an icon layout tuned to one width is wrong at another.
  const cleanupKeyRef = useRef<"name" | "kind" | "value" | null>(null)
  // merged over the old map, not swapped in: defaultPositions only knows the stock objects, and a
  // wholesale replace would strand any user-made folders without a position. Foldered objects are
  // skipped — they hold no desk slot while filed.
  const cleanUp = (assetOrder = assets, contactOrder = contacts) =>
    setPositions((pos) => ({
      ...pos,
      ...defaultPositions(
        assetOrder.filter((a) => !folderedIds.has(a.id)),
        contactOrder.filter((c) => !folderedIds.has(c.id)),
        folders.map((f) => f.id),
        window.innerWidth
      )
    }))
  const cleanUpBy = (key: "name" | "kind" | "value") => {
    cleanupKeyRef.current = key
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
  /** A fresh folder lands right where the menu was opened, pushed aside like any placement — and
   *  arrives already renaming, the way a fresh folder should. */
  const addFolder = (at: Pos) => {
    const id = `folder-new-${folderIdc.current++}`
    setFolders((list) => [...list, { id, label: "New Folder", contents: [] }])
    setPositions((pos) => {
      if (!pos) return pos
      const p = clampPos(at.x - ICON_W / 2, at.y - ICON_PAD - ICON_SLOT / 2)
      return { ...pos, [id]: nearestFreeSpot(p, pos, id) }
    })
    setRenamingId(id)
  }

  const renameFolder = (id: string, name: string) => {
    setFolders((list) => list.map((f) => (f.id === id ? { ...f, label: name } : f)))
    setRenamingId(null)
  }

  /** Deleting a folder never deletes what's in it: the contents spill back onto the desk, cascading
   *  from where the folder stood. */
  const deleteFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id)
    if (!folder) return
    setPositions((pos) => {
      if (!pos) return pos
      const { [id]: at, ...rest } = pos
      const base = at ?? { x: window.innerWidth / 2 - ICON_W / 2, y: window.innerHeight / 2 }
      folder.contents.forEach((cid, i) => {
        rest[cid] = nearestFreeSpot(clampPos(base.x + 24 + i * 24, base.y + i * 12), rest, cid)
      })
      return rest
    })
    setFolders((list) => list.filter((f) => f.id !== id))
    closeFolderWindow(id)
  }

  // events — folder windows. Open on click, close from the window, focus (re-order to top) on press.
  const openFolderWindow = (id: string) => setFolderWins((w) => (w.includes(id) ? [...w.filter((x) => x !== id), id] : [...w, id]))
  const closeFolderWindow = (id: string) => setFolderWins((w) => w.filter((x) => x !== id))

  /** A press on a folder-window tile: the object materialises on the desk under the cursor the moment
   *  the drag passes the pick-up threshold, and from there it IS the ordinary desktop drag — droppable
   *  onto the desk, a contact, or back into a folder. A picked set pulls out together as a group
   *  carry, cascading from the cursor and spreading out wherever it lands. */
  const pullFromFolder = (folderId: string) => (obj: DesktopObj, group: DesktopObj[]) => (e: React.PointerEvent) => {
    if (e.button !== 0) return

    if (group.length > 1) {
      return startCarry(
        group.map((o) => o.id),
        {
          settle: "spread",
          materialize: (x, y) => {
            const idSet = new Set(group.map((o) => o.id))
            setFolders((list) => list.map((f) => (f.id === folderId ? { ...f, contents: f.contents.filter((cid) => !idSet.has(cid)) } : f)))
            const origins = new Map<string, Pos>()
            group.forEach((o, i) => origins.set(o.id, clampPos(x - ICON_W / 2 + i * 14, y - ICON_PAD - ICON_SLOT / 2 + i * 10)))
            setPositions((pos) => (pos ? { ...pos, ...Object.fromEntries(origins) } : pos))
            return origins
          }
        }
      )(e)
    }

    onPointerDown(obj, {
      onStart: (x, y) => {
        setFolders((list) => list.map((f) => (f.id === folderId ? { ...f, contents: f.contents.filter((cid) => cid !== obj.id) } : f)))
        setPositions((pos) => (pos ? { ...pos, [obj.id]: clampPos(x - ICON_W / 2, y - ICON_PAD - ICON_SLOT / 2) } : pos))
      }
    })(e)
  }

  /** Folders move like any icon, but through their own little drag: they never enter the drag store
   *  (nothing 3D flies — the folder art is part of the icon) and they never see drop zones, which is
   *  the whole one-level-deep rule. A press that never travels is a click, which opens the window. */
  const folderMovedRef = useRef(false)
  const startFolderDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 || !positions) return
    // part of a selection: the whole handful goes, folders included (they just can't be filed)
    if (selectedIds.has(id) && selectedIds.size > 1) {
      folderMovedRef.current = true // the click that follows must not open the window
      return startCarry([...selectedIds], { settle: "formation" })(e)
    }
    if (selectedIds.size) setSelectedIds(new Set())
    const origin = positions[id]
    if (!origin) return
    const sx = e.clientX
    const sy = e.clientY
    folderMovedRef.current = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!folderMovedRef.current && Math.hypot(dx, dy) < 6) return
      folderMovedRef.current = true
      const el = iconNodes.current.get(id)
      if (el) {
        el.style.left = `${origin.x + dx}px`
        el.style.top = `${origin.y + dy}px`
      }
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      if (!folderMovedRef.current) return
      const p = clampPos(origin.x + ev.clientX - sx, origin.y + ev.clientY - sy)
      setPositions((pos) => (pos ? { ...pos, [id]: nearestFreeSpot(p, pos, id) } : pos))
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }
  const onFolderOpen = (id: string) => () => {
    // that gesture was a move, not an open
    if (folderMovedRef.current) return
    openFolderWindow(id)
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
    setFolderMenu(null)
    if (obj.class === "asset" && !isSplittable(obj)) return
    setMenu({ x: e.clientX, y: e.clientY, obj })
  }
  const onFolderMenu = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu(null)
    setDeskMenu(null)
    setFolderMenu({ x: e.clientX, y: e.clientY, id })
  }
  const onDeskMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(null)
    setFolderMenu(null)
    setDeskMenu({ x: e.clientX, y: e.clientY })
  }

  const menuItems = (obj: DesktopObj): DesktopMenuItem[] =>
    obj.class === "asset"
      ? [
          { label: "Split asset", icon: Scissors, onSelect: () => startSplit(obj) },
          // design-only for now — the inspector arrives with the dock features
          { label: "Inspect asset", icon: Search, onSelect: () => {} }
        ]
      : [
          { label: "Rename", icon: Pencil, onSelect: () => setRenamingId(obj.id) },
          { label: "Edit", icon: SquarePen, onSelect: () => open({ kind: "contact", contact: obj, matchKey: `contact-${obj.id}` }) },
          // same confirm as the trash — permanent is permanent, whichever gesture asked
          { label: "Delete", icon: Trash2, danger: true, onSelect: () => open({ kind: "delete-contact", contact: obj, matchKey: `delete-${obj.id}` }) }
        ]

  // no confirm on folder delete: nothing is destroyed — the contents just spill back onto the desk
  const folderMenuItems = (id: string): DesktopMenuItem[] => [
    { label: "Rename", icon: Pencil, onSelect: () => setRenamingId(id) },
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => deleteFolder(id) }
  ]
  const deskMenuItems = (at: Pos): DesktopMenuItem[] => [
    { label: "New Contact", icon: UserPlus, onSelect: () => addContact(at) },
    { label: "New Folder", icon: FolderPlus, onSelect: () => addFolder(at) },
    {
      label: "Change Wallpaper",
      icon: ImageIcon,
      children: WALLPAPERS.map((w) => ({ label: w.label, checked: w.label === wallpaper.label, onSelect: () => setWallpaper(w) }))
    },
    {
      label: "Clean Up",
      icon: LayoutGrid,
      separator: true,
      onSelect: () => {
        cleanupKeyRef.current = null
        cleanUp()
      }
    },
    {
      label: "Clean Up By",
      icon: ArrowDownUp,
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

  // effects — the starting arrangement needs the viewport's width, which the server doesn't have.
  // Foldered objects take no slot: the desk lays out only what it shows.
  useEffect(() => {
    const filed = new Set(INITIAL_FOLDERS.flatMap((f) => f.contents))
    setPositions(
      defaultPositions(
        [...ASSETS, ...DUST_ASSETS, ...DUST_NFTS].filter((a) => !filed.has(a.id)),
        PEOPLE,
        INITIAL_FOLDERS.map((f) => f.id),
        window.innerWidth
      )
    )
  }, [])

  // effects — a resize re-runs the last clean-up (the plain one, or whichever "Clean Up By" was used
  // last). The listener reads through a ref so it always sees the current assets and contacts without
  // re-registering on every change.
  const relayoutRef = useRef(() => {})
  useEffect(() => {
    relayoutRef.current = () => (cleanupKeyRef.current ? cleanUpBy(cleanupKeyRef.current) : cleanUp())
  })
  useEffect(() => {
    const onResize = () => relayoutRef.current()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // effects — the split-flash timer must not fire into an unmounted tree
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // effects — the dragged icon is positioned imperatively, and any re-render mid-drag (targets
  // lighting, dimming) resets its wrapper to the stale state position. Re-pin it after every render,
  // before paint, so the stale value never shows. And once nothing is in hand, write every wrapper
  // back to its stored spot: React skips re-writing a style prop it considers unchanged, so a drop
  // that resolves to the icon's existing position (a second drop pushed off the dock to the same
  // clearance spot, say) would otherwise leave the wrapper wherever the drag left it.
  useLayoutEffect(() => {
    if (dragged) {
      placeNode(dragged.id, coinView.cursor.x, coinView.cursor.y)
      return
    }
    // a selection mid-carry is placed imperatively too — resyncing now would snap it out of the hand
    if (carriedIds) return
    if (!positions) return
    for (const [id, el] of iconNodes.current) {
      const p = positions[id]
      if (!p) continue
      el.style.left = `${p.x}px`
      el.style.top = `${p.y}px`
    }
  })

  return (
    <>
      {/* the wallpaper is its own bottom layer, so the greeting (painted next) shows over it while
          still sitting under every icon, coin and badge */}
      <div aria-hidden className="fixed inset-0" style={{ background: wallpaper.css }} />

      <DesktopBar assets={assets} />

      {/* icon positions are viewport coordinates, so this layer must be the viewport — offsetting it
          (say, below the bar) would land every drop that offset away from the cursor. The clamp is what
          keeps icons out from under the bar, not the container. It owns the desk's own right-click
          menu; the wallpaper lives on the underlay above so the greeting can slot between them. */}
      <div ref={rootRef} className="absolute inset-0" onContextMenu={onDeskMenu} onPointerDown={onDeskPointerDown}>
        {positions &&
          assets.map((a) => {
            const p = positions[a.id]
            if (!p || folderedIds.has(a.id)) return null
            return (
              <div
                key={a.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(a.id, el)
                  else iconNodes.current.delete(a.id)
                }}
                // in hand: above everything on the desk — folder windows included — and
                // pointer-transparent so the drop hit-testing sees the zones underneath
                className={cn("absolute", (dragged?.id === a.id || carriedIds?.has(a.id)) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopIcon
                  obj={a}
                  label={desktopLabel(a)}
                  // only a valid merge target carries a drop key, so a drop can never land where it can't resolve
                  dropKey={draggedAsset && canCombine(draggedAsset, a) ? assetDropKey(a.id) : undefined}
                  dimmed={!!draggedAsset && !isSameToken(draggedAsset, a)}
                  target={!!draggedAsset && canCombine(draggedAsset, a)}
                  over={!!draggedAsset && over === assetDropKey(a.id)}
                  selected={menu?.obj.id === a.id || selectedIds.has(a.id)}
                  flash={flashIds.has(a.id)}
                  anyDragging={anyDragging}
                  onPointerDown={onIconPointerDown(a)}
                  onContextMenu={onIconMenu(a)}
                />
              </div>
            )
          })}

        {positions &&
          contacts.map((c) => {
            const p = positions[c.id]
            if (!p || folderedIds.has(c.id)) return null
            return (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(c.id, el)
                  else iconNodes.current.delete(c.id)
                }}
                className={cn("absolute", (dragged?.id === c.id || carriedIds?.has(c.id)) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopIcon
                  obj={c}
                  label={desktopLabel(c)}
                  dropKey={walletDropKey(c.id)}
                  target={!!draggedAsset || (carriedHasAsset && !carriedIds?.has(c.id))}
                  over={(!!draggedAsset || carriedHasAsset) && over === walletDropKey(c.id)}
                  selected={menu?.obj.id === c.id || selectedIds.has(c.id)}
                  anyDragging={anyDragging}
                  renaming={renamingId === c.id}
                  onRename={(name) => renameContact(c.id, name)}
                  onRenameCancel={() => setRenamingId(null)}
                  onPointerDown={onIconPointerDown(c)}
                  onContextMenu={onIconMenu(c)}
                />
              </div>
            )
          })}

        {/* the folders — Other Tokens plus any the desk menu created. Click opens the window, drag
            moves, and anything in hand (except another folder) can be filed onto them */}
        {positions &&
          folders.map((f) => {
            const p = positions[f.id]
            if (!p) return null
            return (
              <div
                key={f.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(f.id, el)
                  else iconNodes.current.delete(f.id)
                }}
                className={cn("absolute", carriedIds?.has(f.id) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopFolder
                  label={f.label}
                  count={f.contents.length}
                  dropKey={dragged ? folderDropKey(f.id) : undefined}
                  target={(!!dragged || carriedHasFilable) && !carriedIds?.has(f.id)}
                  over={over === folderDropKey(f.id)}
                  selected={selectedIds.has(f.id)}
                  renaming={renamingId === f.id}
                  onRename={(name) => renameFolder(f.id, name)}
                  onRenameCancel={() => setRenamingId(null)}
                  onPointerDown={startFolderDrag(f.id)}
                  onDoubleClick={onFolderOpen(f.id)}
                  onContextMenu={onFolderMenu(f.id)}
                />
              </div>
            )
          })}

        {/* the marquee — drawn while a selection is being dragged out on the desk itself */}
        {marquee && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-[80] rounded-4 border border-dashed border-white/60 bg-white/10"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0)
            }}
          />
        )}
      </div>

      {/* the dock — the DOM shelf; its icons are drawn by the scene below */}
      <DesktopDock carriedAsset={carriedHasAsset} />

      {/* the 3D objects — draws into the slots the icons above registered */}
      <ObjectScene items={deskItems} nav={NAV_ITEMS} />

      {/* open folders — windows, not modals: the desk stays live around them. Stacking follows the
          open/focus order; they sit above the resting canvas (z-50) and under the modals (z-200+). */}
      {folderWins.map((id, i) => {
        const f = folders.find((x) => x.id === id)
        if (!f) return null
        const items = f.contents.map((cid) => allItems.find((o) => o.id === cid)).filter((o): o is DesktopObj => !!o)
        return (
          <FolderWindow
            key={id}
            label={f.label}
            items={items}
            z={100 + i}
            dropKey={folderDropKey(f.id)}
            onClose={() => closeFolderWindow(id)}
            onFocus={() => openFolderWindow(id)}
            onItemPointerDown={pullFromFolder(f.id)}
            onItemContextMenu={onIconMenu}
            flashIds={flashIds}
            // the same merge-target rule the desk icons use, so split portions recombine in place
            itemDropKey={(o) => (draggedAsset && o.class === "asset" && canCombine(draggedAsset, o) ? assetDropKey(o.id) : undefined)}
            itemDimmed={(o) => !!draggedAsset && o.class === "asset" && !isSameToken(draggedAsset, o)}
            overKey={over}
          />
        )
      })}

      {/* modals */}
      {wins.map((w, i) => {
        const z = 200 + i
        if (w.kind === "transfer")
          return <TransferWindow key={w.id} assets={w.assets} to={w.to} z={z} onClose={() => close(w.id)} onSettle={onSettle} onLog={noop} />
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
      {folderMenu && <DesktopMenu x={folderMenu.x} y={folderMenu.y} items={folderMenuItems(folderMenu.id)} onClose={() => setFolderMenu(null)} />}

      <ObjectHoverInfo items={deskItems} />
    </>
  )
}
