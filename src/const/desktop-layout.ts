// The desk's geometry and the maths that places things on it: the icon/card footprints, the stock
// arrangement, the keep-out clamp and the collision search. Pure functions of their arguments plus the
// module mirrors in `stores/desk.ts` — no React, no DOM writes — so every one of them is safe to call
// from a pointer handler on the drag's hot path.
//
// Coordinates are PANE-relative throughout (see `const/pane.ts`): the same numbers describe a
// full-screen desk and a half-screen one, which is what lets an arrangement survive the split view.
import { chromeKeepout } from "@/stores/chrome-keepout"
import { detailCardIds, panesMirror, walletOfId } from "@/stores/desk"
import type { AssetObj, PersonObj } from "@/types/objects"

import type { Wallet } from "@/lib/wallets"

import type { Pane } from "./pane"

/** An icon's top-left corner, in viewport px. */
export type Pos = { x: number; y: number }

// ── Footprints ───────────────────────────────────────────────────────────────
// Exported here rather than from the components that draw them: the layout maths is the primary reader,
// and a const file importing a component to learn its width would invert the dependency.

/** The icon's fixed footprint. */
export const ICON_W = 104
export const ICON_SLOT = 48
export const ICON_PAD = 8
/** Room under the slot for the label and the value pill, so the bottom clamp keeps both on screen. */
export const ICON_FOOT = 64

/** The detail card's fixed footprint — the same holding shown at length instead of as an icon. */
export const CARD_W = 260
export const CARD_H = 140

/** The dock shelf's footprint, so the desk can keep parked icons clear of it — an icon left under the
 *  shelf could never be picked back up through it. Width = 7 tiles of 48, 4px gaps, 4px side pads. */
export const DOCK_W = 368
export const DOCK_H = 56
export const DOCK_GAP = 8

/** How far down the split view's pane labels sit, and how tall the label pill is. The floating search /
 *  mute / view-switcher cluster owns the top-right corner down to 40px, and the right pane's label sits
 *  underneath it — level with that cluster the label simply disappears behind it. */
export const LABEL_TOP = 48
export const LABEL_H = 28

/** What an object occupies on the desk. */
export type Box = { w: number; h: number }
export const ICON_BOX: Box = { w: ICON_W, h: ICON_SLOT + ICON_FOOT }
export const CARD_BOX: Box = { w: CARD_W, h: CARD_H }

export const boxOf = (id?: string): Box => (id && detailCardIds.has(id) ? CARD_BOX : ICON_BOX)

// The default arrangement, straight from the design: assets in columns filled top-to-bottom from the left
// edge (the Other Tokens folder takes the slot after the last asset), contacts in rows of 3 anchored to
// The default arrangement, straight from the design: assets in columns filled top-to-bottom from the left
// edge (the Other Tokens folder takes the slot after the last asset), contacts in rows of 3 anchored to
// the bottom-right, clear of the top-right widgets. Only the starting point; every drag rewrites it.
export const EDGE = 32
export const TOP = 192 // clears the greeting block top-left
/** Split view has no greeting — just the pane's own wallet label, which needs far less room. Starts
 *  below that label rather than at a guessed offset, so moving the label moves the desk with it. */
export const SPLIT_TOP = LABEL_TOP + LABEL_H + 12
export const BOTTOM = 80 // clearance from the bottom edge, under the lowest icon's label pill
export const ROWS = 5 // the design's column height — a cap; a short screen fits fewer (below)
export const COL_W = 105
export const ROW_H = 112
/** The slot sits centred in the icon's wrapper; layout speaks slot edges, positions speak wrappers. */
export const SLOT_INSET = (ICON_W - ICON_SLOT) / 2
export const CONTACT_COLS = 3

/** Lay out one wallet's desk inside its own pane. Coordinates come out pane-relative (see const/pane), so
 *  the same numbers describe a full-screen desk and a half-screen one. */
export function defaultPositions(assets: AssetObj[], contacts: PersonObj[], folderIds: string[], pane: Pane, top: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {}
  const { width, height } = pane

  // assets fill columns from the top-left. How many rows deep is capped at the design's five, but shrinks
  // on a short screen so the bottom row never runs off the edge — which is what cut the tokens off on a
  // laptop — spilling into another column instead.
  const fitRows = Math.floor((height - BOTTOM - ICON_SLOT - ICON_FOOT - top) / ROW_H) + 1
  const assetRows = Math.min(ROWS, Math.max(1, fitRows))
  const assetSlot = (i: number): Pos => ({ x: EDGE - SLOT_INSET + Math.floor(i / assetRows) * COL_W, y: top + (i % assetRows) * ROW_H })
  assets.forEach((a, i) => {
    pos[a.id] = assetSlot(i)
  })
  folderIds.forEach((fid, i) => {
    pos[fid] = assetSlot(assets.length + i)
  })

  // contacts sit along the bottom-right of the pane, clear of the top-right widget bento. Rows stack
  // upward from the bottom edge, so the grid hugs the bottom whatever the screen height.
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

/** Keep an object on its own wallet's desk — fully visible edge to edge (the chrome floats; nothing owns
 *  a strip), and never under the pieces of chrome that sit above the icon layer (the dock shelf, the
 *  top-right toggles + balance card): an icon parked beneath those could never be picked back up through
 *  them. Anything landing there steps clear.
 *
 *  Coordinates in and out are PANE-relative. The dock and the top-right chrome are viewport furniture
 *  that spans both panes, so those two tests convert to viewport coordinates and back.
 *
 *  Pass the object's id so a detail card is clamped by its own (much wider) footprint rather than an
 *  icon's — and `wallet` when the object is too new to be in the mirror yet. */
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

/** Do these two resting objects clash? Icon against icon keeps the radial test the desk's spacing was
 *  tuned around, so nothing about the existing arrangement shifts; a detail card is far too wide for a
 *  single radius to describe, so any pair involving one falls back to a plain box intersection. */
export function clashes(aId: string, a: Pos, bId: string, b: Pos) {
  if (!detailCardIds.has(aId) && !detailCardIds.has(bId)) return Math.hypot(a.x - b.x, a.y - b.y) < MIN_DIST
  const ba = boxOf(aId)
  const bb = boxOf(bId)
  return a.x < b.x + bb.w && a.x + ba.w > b.x && a.y < b.y + bb.h && a.y + ba.h > b.y
}

/** Only objects on the SAME wallet's desk can clash. The two panes never overlap on screen, and outside
 *  split view only one wallet is shown at all — so MetaMask's arrangement must never push Openfort's
 *  icons around, even though both live in one positions map. */
export function isFree(p: Pos, positions: Record<string, Pos>, ignoreId: string, wallet: Wallet = walletOfId(ignoreId)) {
  for (const [id, q] of Object.entries(positions)) {
    if (id === ignoreId || walletOfId(id) !== wallet) continue
    if (clashes(ignoreId, p, id, q)) return false
  }
  return true
}

/** The nearest clear spot to where the object wants to land: try the spot itself, then walk rings
 *  outward around it until a candidate has breathing room. Searching by growing radius means the first
 *  hit is (near enough) the closest. A desk too packed to have one just takes the overlap.
 *
 *  `minY` is a floor the search may not climb above. Dropping something is always the user's placement
 *  and takes no floor; an automatic tidy does, or a card pushed off a grid slot finds its room by
 *  reversing up into the greeting rather than stepping sideways. */
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

/** The formation equivalent of nearestFreeSpot: one shared offset that lifts an entire carried handful
 *  clear of the resting icons, so a dropped multi-selection keeps its shape instead of scattering. The
 *  carried ids are skipped as obstacles — they're the ones in motion — and each landing is clamped the
 *  same way it will be when placed, so an edge push-away still reads as clear. Returns null when no offset
 *  keeps the whole formation clear — in particular when a clamp against a keep-out (the widgets, the dock,
 *  a screen edge) would collapse members onto each other — so the caller can scatter instead of stacking. */
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
