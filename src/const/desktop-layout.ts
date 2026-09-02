// The desk's geometry and the maths that places things on it. No React and no DOM writes, so every
// function here is safe to call from a pointer handler. Coordinates are pane-relative throughout.
import { chromeKeepout } from "@/stores/chrome-keepout"
import { detailCardIds, panesMirror, walletOfId } from "@/stores/desk"
import type { AssetObj, PersonObj } from "@/types/objects"

import type { Wallet } from "@/lib/wallets"

import type { Pane } from "./pane"

export type Pos = { x: number; y: number }

// ── Footprints ───────────────────────────────────────────────────────────────

export const ICON_W = 104
export const ICON_SLOT = 48
export const ICON_PAD = 8
/** Room under the slot for the label and the value pill, so the bottom clamp keeps both on screen. */
export const ICON_FOOT = 64

export const CARD_W = 260
export const CARD_H = 140

/** 7 tiles of 48, 4px gaps, 4px side pads. */
export const DOCK_W = 368
export const DOCK_H = 56
export const DOCK_GAP = 8

/** The floating search / mute / view cluster owns the corner down to 40px, so the label sits under it. */
export const LABEL_TOP = 48
export const LABEL_H = 28

export type Box = { w: number; h: number }
export const ICON_BOX: Box = { w: ICON_W, h: ICON_SLOT + ICON_FOOT }
export const CARD_BOX: Box = { w: CARD_W, h: CARD_H }

export const boxOf = (id?: string): Box => (id && detailCardIds.has(id) ? CARD_BOX : ICON_BOX)

// The stock arrangement, straight from the design. Only the starting point; every drag rewrites it.
export const EDGE = 32
export const TOP = 192 // clears the greeting block top-left
/** Split view has no greeting. Derived from the label rather than guessed, so moving one moves both. */
export const SPLIT_TOP = LABEL_TOP + LABEL_H + 12
export const BOTTOM = 80 // clearance from the bottom edge, under the lowest icon's label pill
export const ROWS = 5 // the design's column height — a cap; a short screen fits fewer (below)
export const COL_W = 105
export const ROW_H = 112
/** The slot sits centred in the icon's wrapper; layout speaks slot edges, positions speak wrappers. */
export const SLOT_INSET = (ICON_W - ICON_SLOT) / 2
export const CONTACT_COLS = 3

export function defaultPositions(assets: AssetObj[], contacts: PersonObj[], folderIds: string[], pane: Pane, top: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {}
  const { width, height } = pane

  // the row cap shrinks on a short screen so the bottom row never runs off the edge — which is what cut
  // the tokens off on a laptop — spilling into another column instead
  const fitRows = Math.floor((height - BOTTOM - ICON_SLOT - ICON_FOOT - top) / ROW_H) + 1
  const assetRows = Math.min(ROWS, Math.max(1, fitRows))
  const assetSlot = (i: number): Pos => ({ x: EDGE - SLOT_INSET + Math.floor(i / assetRows) * COL_W, y: top + (i % assetRows) * ROW_H })
  assets.forEach((a, i) => {
    pos[a.id] = assetSlot(i)
  })
  folderIds.forEach((fid, i) => {
    pos[fid] = assetSlot(assets.length + i)
  })

  // rows stack upward from the bottom edge, so the grid hugs the bottom whatever the screen height
  const contactRows = Math.max(1, Math.ceil(contacts.length / CONTACT_COLS))
  const bottomRowY = height - BOTTOM - ICON_SLOT - ICON_FOOT
  contacts.forEach((c, i) => {
    const row = Math.floor(i / CONTACT_COLS)
    const col = i % CONTACT_COLS
    pos[c.id] = {
      x: width - EDGE - ICON_SLOT - SLOT_INSET - (CONTACT_COLS - 1 - col) * COL_W,
      y: bottomRowY - (contactRows - 1 - row) * ROW_H
    }
  })
  return pos
}

/** Keep an object on its own wallet's desk and clear of the chrome above the icon layer — an icon parked
 *  under the dock or the bento could never be picked back up through it.
 *
 *  In and out are pane-relative; the dock and the top-right chrome are viewport furniture spanning both
 *  panes, so those two tests convert and back. Pass `wallet` when the object is too new for the mirror. */
export function clampPos(x: number, y: number, id?: string, wallet?: Wallet): Pos {
  const box = boxOf(id)
  const pane = panesMirror[wallet ?? walletOfId(id)]
  const cx = Math.min(Math.max(x, 4), pane.width - box.w - 4)
  let cy = Math.min(Math.max(y, 4), pane.height - box.h)

  const vx = pane.left + cx
  const dockTop = window.innerHeight - DOCK_GAP - DOCK_H
  const dockLeft = (window.innerWidth - DOCK_W) / 2
  const overlapsDock = vx + box.w > dockLeft - 4 && vx < dockLeft + DOCK_W + 4 && pane.top + cy + box.h > dockTop
  if (overlapsDock) cy = dockTop - pane.top - box.h

  const overlapsChrome = vx + box.w > window.innerWidth - chromeKeepout.w && pane.top + cy < chromeKeepout.h
  if (overlapsChrome) cy = chromeKeepout.h - pane.top

  return { x: cx, y: cy }
}

/** Two icons closer than this read as overlapping. Roughly the icon's own footprint. */
export const MIN_DIST = 100

/** Icon against icon keeps the radial test the desk's spacing was tuned around; a card is too wide for
 *  one radius to describe, so any pair involving one falls back to a box intersection. */
export function clashes(aId: string, a: Pos, bId: string, b: Pos) {
  if (!detailCardIds.has(aId) && !detailCardIds.has(bId)) return Math.hypot(a.x - b.x, a.y - b.y) < MIN_DIST
  const ba = boxOf(aId)
  const bb = boxOf(bId)
  return a.x < b.x + bb.w && a.x + ba.w > b.x && a.y < b.y + bb.h && a.y + ba.h > b.y
}

/** Only objects on the SAME wallet's desk can clash — both wallets share one positions map, and one
 *  desk's arrangement must never push the other's icons around. */
export function isFree(p: Pos, positions: Record<string, Pos>, ignoreId: string, wallet: Wallet = walletOfId(ignoreId)) {
  for (const [id, q] of Object.entries(positions)) {
    if (id === ignoreId || walletOfId(id) !== wallet) continue
    if (clashes(ignoreId, p, id, q)) return false
  }
  return true
}

/** Walks rings outward until a candidate has breathing room, so the first hit is near enough the
 *  closest. A desk too packed to have one takes the overlap.
 *
 *  `minY` is a floor the search may not climb above: a drop is the user's placement and takes none, but
 *  an automatic tidy does, or a card pushed off its slot reverses up into the greeting. */
export function nearestFreeSpot(desired: Pos, positions: Record<string, Pos>, ignoreId: string, minY = 0, wallet?: Wallet): Pos {
  const d = clampPos(desired.x, Math.max(desired.y, minY), ignoreId, wallet)
  if (isFree(d, positions, ignoreId, wallet)) return d
  for (let r = MIN_DIST; r <= MIN_DIST * 6; r += MIN_DIST / 2) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const c = clampPos(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, ignoreId, wallet)
      if (c.y >= minY && isFree(c, positions, ignoreId, wallet)) return c
    }
  }
  return d
}

/** nearestFreeSpot for a whole handful: one shared offset, so a dropped multi-selection keeps its shape.
 *  Null when no offset keeps the formation clear — a clamp against a keep-out can collapse members onto
 *  each other — so the caller can scatter instead of stacking. */
export function nearestFreeGroupOffset(desired: { id: string; p: Pos }[], positions: Record<string, Pos>, carriedIds: ReadonlySet<string>): Pos | null {
  const clear = (ox: number, oy: number) => {
    const landed: { id: string; p: Pos }[] = []
    for (const d of desired) {
      const p = clampPos(d.p.x + ox, d.p.y + oy, d.id)
      for (const [id, q] of Object.entries(positions)) {
        if (carriedIds.has(id) || walletOfId(id) !== walletOfId(d.id)) continue
        if (clashes(d.id, p, id, q)) return false
      }
      // ...and against the handful's own already-placed members, so a clamp that folds two of them onto
      // the same spot is rejected rather than stacked
      for (const l of landed) if (walletOfId(l.id) === walletOfId(d.id) && clashes(d.id, p, l.id, l.p)) return false
      landed.push({ id: d.id, p })
    }
    return true
  }
  if (clear(0, 0)) return { x: 0, y: 0 }
  for (let r = MIN_DIST; r <= MIN_DIST * 6; r += MIN_DIST / 2) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const off = { x: Math.cos(a) * r, y: Math.sin(a) * r }
      if (clear(off.x, off.y)) return off
    }
  }
  return null
}
