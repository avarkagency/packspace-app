"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { CONNECTED_NETWORK } from "@/const/app-config"
import { type Pane, paneFor, walletAtX } from "@/const/pane"
import { useDesktopDrag } from "@/hooks/useDesktopDrag"
import { chromeKeepout } from "@/stores/chrome-keepout"
import { coinView, registerCoinViewport, setCoinHover } from "@/stores/coin"
import { endDrag, setOver, startGroupDrag, useDrag } from "@/stores/drag"
import type { Approval, AssetObj, DesktopObj, PackObj, PersonObj, Receipt } from "@/types/objects"
import {
  ArrowDownUp,
  BadgeCheck,
  Ban,
  CreditCard,
  FolderPlus,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Scissors,
  Search,
  ShieldCheck,
  ShieldX,
  SquarePen,
  Trash2,
  UserPlus
} from "lucide-react"

import { PanelApprovals } from "@/components/desktop/panel/PanelApprovals"
import { PanelInspector } from "@/components/desktop/panel/PanelInspector"
import { Widget } from "@/components/desktop/widget/Widget"
import { WindowCard } from "@/components/desktop/window/WindowCard"
import { WindowCombine } from "@/components/desktop/window/WindowCombine"
import { WindowContact } from "@/components/desktop/window/WindowContact"
import { WindowDelete } from "@/components/desktop/window/WindowDelete"
import { WindowFolder } from "@/components/desktop/window/WindowFolder"
import type { GiveSlot, HandoffReceive } from "@/components/desktop/window/WindowHandoff"
import { WindowMove } from "@/components/desktop/window/WindowMove"
import { type PackDraft, WindowPackBuilder } from "@/components/desktop/window/WindowPackBuilder"
import { WindowReceipt } from "@/components/desktop/window/WindowReceipt"
import { WindowReceipts } from "@/components/desktop/window/WindowReceipts"
import type { SendDeal } from "@/components/desktop/window/WindowSend"
import { WindowSplit } from "@/components/desktop/window/WindowSplit"
import { WindowTransfer } from "@/components/desktop/window/WindowTransfer"
import { WindowUnpack } from "@/components/desktop/window/WindowUnpack"

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
import { isProjectG, routeLine } from "@/lib/chain"
import type { Inspectable } from "@/lib/inspect"
import { cue, installPressCues } from "@/lib/sound"
import { cn, desktopLabel, fakeHash, round4, units } from "@/lib/utils"
import { type View, WALLET_ORDER, type Wallet, moveBlockMessage, visibleWallets, walletLabel, walletOf } from "@/lib/wallets"
import { WIDGET_TYPES, type WidgetInstance, type WidgetType } from "@/lib/widgets"

import { APPROVAL_RADAR } from "@/data/approvals"
import { NAV_ITEMS } from "@/data/apps"
import { ASSETS, DUST_ASSETS, DUST_NFTS, EOA_ASSETS } from "@/data/assets"
import { EOA_PEOPLE, PEOPLE } from "@/data/people"

import { DesktopBar } from "./DesktopBar"
import { CARD_H, CARD_W, DesktopDetailCard } from "./DesktopDetailCard"
import { DOCK_GAP, DOCK_H, DOCK_W, DesktopDock, dropTileAt } from "./DesktopDock"
import { DesktopFolder } from "./DesktopFolder"
import { DesktopHover } from "./DesktopHover"
import { DesktopIcon, ICON_PAD, ICON_SLOT, ICON_W } from "./DesktopIcon"
import { DesktopMenu, type DesktopMenuItem } from "./DesktopMenu"
import { DesktopPack } from "./DesktopPack"
import { DesktopPanes, LABEL_H, LABEL_TOP } from "./DesktopPanes"
import { DesktopSearch, type SearchItem } from "./DesktopSearch"
import { DesktopToast, type ToastTone } from "./DesktopToast"

// The desktop. Floating chrome over the wallpaper — greeting and balance card up top, the app dock
// along the bottom; between them every object sits wherever it was last put — holdings start in
// columns on the left, wallets on the right, and dragging anywhere just places the icon
// exactly where it's released. Everything happens on the objects themselves:
// hover to inspect, drop a holding on a wallet to act on it (the transfer modal asks Send or Trade),
// drop onto a matching portion to combine, right-click for the object's own menu (Split on a token;
// Rename / Edit / Delete on a wallet). The desk itself right-clicks to housekeeping: New Contact,
// Change Wallpaper, Clean Up, Clean Up By.

// WebGL can't render on the server, and the coin faces are drawn to a 2D canvas at material-build time.
const ObjectScene = dynamic(() => import("@/components/desktop/object/ObjectScene").then((m) => m.ObjectScene), { ssr: false })

type WinBody =
  | { kind: "transfer"; assets: AssetObj[]; to: PersonObj }
  | { kind: "split"; asset: AssetObj }
  | { kind: "combine"; a: AssetObj; b: AssetObj }
  | { kind: "contact"; contact: PersonObj }
  | { kind: "new-contact"; draft: PersonObj; at: Pos; wallet: Wallet }
  | { kind: "delete-contact"; contact: PersonObj }
  | { kind: "receipt"; receipt: Receipt }
  // only holdings reach this: an address copies across on release instead (see `copyContactTo`)
  | { kind: "move"; asset: AssetObj; from: Wallet; to: Wallet; existing: AssetObj | null }

type WinDraft = WinBody & { matchKey: string }
type WinSpec = WinDraft & { id: string }

// `fromSearch` menus are raised over the palette — picking an action dismisses the palette so the result
// (a window, the Inspector) isn't left hidden beneath it.
type MenuSpec = { x: number; y: number; obj: DesktopObj; fromSearch?: boolean }

/** An icon's top-left corner, in viewport px. */
type Pos = { x: number; y: number }

// The default arrangement, straight from the design: assets in columns filled top-to-bottom from the left
// edge (the Other Tokens folder takes the slot after the last asset), contacts in rows of 3 anchored to
// the bottom-right, clear of the top-right widgets. Only the starting point; every drag rewrites it.
const EDGE = 32
const TOP = 192 // clears the greeting block top-left
/** Split view has no greeting — just the pane's own wallet label, which needs far less room. Starts
 *  below that label rather than at a guessed offset, so moving the label moves the desk with it. */
const SPLIT_TOP = LABEL_TOP + LABEL_H + 12
const BOTTOM = 80 // clearance from the bottom edge, under the lowest icon's label pill
const ROWS = 5 // the design's column height — a cap; a short screen fits fewer (below)
const COL_W = 105
const ROW_H = 112
/** The slot sits centred in the icon's wrapper; layout speaks slot edges, positions speak wrappers. */
const SLOT_INSET = (ICON_W - ICON_SLOT) / 2
const CONTACT_COLS = 3

/** The Other Tokens folder's desk id. */
const FOLDER_ID = "folder-other"

/** A desk folder: a name, the wallet whose desk it sits on, and the ids it holds. Objects in a folder
 *  stay in the flat asset/contact lists — the desk simply doesn't show them, so pulling one out is just
 *  removing its id here. */
type FolderSpec = { id: string; label: string; wallet: Wallet; contents: string[] }

/** First run: the token dust lives in Other Tokens, the NFT dust in Other NFTs — both on the Openfort
 *  desk, which is where that dust is held. MetaMask starts with no folders of its own. A module constant
 *  so the initial layout effect can lay out the desk without depending on folder state. */
const INITIAL_FOLDERS: FolderSpec[] = [
  { id: FOLDER_ID, label: "Other tokens", wallet: "openfort", contents: DUST_ASSETS.map((a) => a.id) },
  { id: "folder-other-nfts", label: "Other NFTs", wallet: "openfort", contents: DUST_NFTS.map((a) => a.id) }
]

/** Lay out one wallet's desk inside its own pane. Coordinates come out pane-relative (see const/pane), so
 *  the same numbers describe a full-screen desk and a half-screen one. */
function defaultPositions(assets: AssetObj[], contacts: PersonObj[], folderIds: string[], pane: Pane, top: number): Record<string, Pos> {
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

/** Room under the slot for the label and the value pill, so the bottom clamp keeps both on screen. */
const ICON_FOOT = 64

/** What an object occupies on the desk. */
type Box = { w: number; h: number }
const ICON_BOX: Box = { w: ICON_W, h: ICON_SLOT + ICON_FOOT }
const CARD_BOX: Box = { w: CARD_W, h: CARD_H }

/** The holdings currently shown as detail cards rather than icons, mirrored out of React state (see
 *  `applyCardIds`). The layout maths below is module-level and runs on the drag's hot path, so it reads
 *  the footprint from here rather than having a lookup threaded through all twenty-odd call sites —
 *  the same trick `chromeKeepout` uses for the widget grid's box. */
const detailCardIds = new Set<string>()

const boxOf = (id?: string): Box => (id && detailCardIds.has(id) ? CARD_BOX : ICON_BOX)

/** Which wallet each object belongs to, and the pane each wallet currently occupies — both mirrored out
 *  of React state for exactly the reason `detailCardIds` is: the layout maths below is module-level and
 *  runs on the drag's hot path, so it resolves an object's pane by lookup rather than having a rect
 *  threaded through all twenty-odd call sites. Written by `applyPanes` / `applyObjectWallets`. */
const objectWallet = new Map<string, Wallet>()
const panesMirror: Record<Wallet, Pane> = {
  openfort: { left: 0, top: 0, width: 0, height: 0 },
  eoa: { left: 0, top: 0, width: 0, height: 0 }
}

/** An object's wallet. Unknown ids read as Openfort — which covers an object being placed in the same
 *  tick it's created, before the mirror catches up; those call sites pass their wallet explicitly. */
const walletOfId = (id?: string): Wallet => (id ? (objectWallet.get(id) ?? "openfort") : "openfort")

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
function clampPos(x: number, y: number, id?: string, wallet?: Wallet): Pos {
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
const MIN_DIST = 100

/** Do these two resting objects clash? Icon against icon keeps the radial test the desk's spacing was
 *  tuned around, so nothing about the existing arrangement shifts; a detail card is far too wide for a
 *  single radius to describe, so any pair involving one falls back to a plain box intersection. */
function clashes(aId: string, a: Pos, bId: string, b: Pos) {
  if (!detailCardIds.has(aId) && !detailCardIds.has(bId)) return Math.hypot(a.x - b.x, a.y - b.y) < MIN_DIST
  const ba = boxOf(aId)
  const bb = boxOf(bId)
  return a.x < b.x + bb.w && a.x + ba.w > b.x && a.y < b.y + bb.h && a.y + ba.h > b.y
}

/** Only objects on the SAME wallet's desk can clash. The two panes never overlap on screen, and outside
 *  split view only one wallet is shown at all — so MetaMask's arrangement must never push Openfort's
 *  icons around, even though both live in one positions map. */
function isFree(p: Pos, positions: Record<string, Pos>, ignoreId: string, wallet: Wallet = walletOfId(ignoreId)) {
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
function nearestFreeSpot(desired: Pos, positions: Record<string, Pos>, ignoreId: string, minY = 0, wallet?: Wallet): Pos {
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
function nearestFreeGroupOffset(desired: { id: string; p: Pos }[], positions: Record<string, Pos>, carriedIds: ReadonlySet<string>): Pos | null {
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

/** The wallpaper choices behind "Change Wallpaper ▸" — the design's two gradient images. */
const WALLPAPERS = [
  { label: "Dusk", css: "#000014 url(/images/bg.png) center / cover no-repeat" },
  { label: "Sea", css: "#000a10 url(/images/bg2.png) center / cover no-repeat" }
] as const

type Wallpaper = (typeof WALLPAPERS)[number]

/** Each wallet's desk starts with its own copy of the stock bento — same two widgets, separate instances.
 *  From then on they diverge: resizing, reordering or removing a widget on one desk leaves the other's
 *  arrangement exactly as it was. */
const initialWidgets = (): Record<Wallet, WidgetInstance[]> => ({
  openfort: [
    { id: "w-openfort-balance", type: "balance", span: 2 },
    { id: "w-openfort-nft", type: "nft", span: 2 }
  ],
  eoa: [
    { id: "w-eoa-balance", type: "balance", span: 2 },
    { id: "w-eoa-nft", type: "nft", span: 2 }
  ]
})

/** A wallpaper each, so the two halves of the split view are told apart by the desk itself. */
const initialWallpapers = (): Record<Wallet, Wallpaper> => ({ openfort: WALLPAPERS[0], eoa: WALLPAPERS[1] })

/** The top-right chrome still floating in split view — the search / mute buttons and the view switcher.
 *  Narrower and much shorter than the widget bento's box, but an icon parked under it would still be
 *  unreachable, so the clamp keeps honouring one. */
const SPLIT_KEEPOUT = { w: 392, h: 48 }

export function Desktop() {
  // refs
  const rootRef = useRef<HTMLDivElement>(null)
  const idc = useRef(0)
  const assetIdc = useRef(0)
  const contactIdc = useRef(0)
  const folderIdc = useRef(0)
  const packIdc = useRef(0)
  const widgetIdc = useRef(0)
  const toastIdc = useRef(0)
  /** The icon wrapper nodes, for the drag to move without a render. */
  const iconNodes = useRef(new Map<string, HTMLElement>())
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** A pack press that never travelled is a click — open it rather than treat the gesture as a move. */
  const packMovedRef = useRef(false)
  /** Ids currently in hand having been pulled out of a folder — they whisper only if they land on the
   *  desk (taken out), not if they're dropped straight back into a folder. */
  const pulledFromFolder = useRef(new Set<string>())

  // state — which wallet's desk is on screen, and how the split view divides it
  const [view, setView] = useState<View>("openfort")
  const [splitRatio, setSplitRatio] = useState(0.5)
  /** The viewport, tracked in state (not read ad-hoc) because the pane maths renders from it. Zero until
   *  the mount effect measures — the server has no window. */
  const [screen, setScreen] = useState({ w: 0, h: 0 })

  // state — assets divide and recombine; wallets rename, edit and delete; positions are the desk itself
  const [assets, setAssets] = useState<AssetObj[]>([...ASSETS, ...DUST_ASSETS, ...DUST_NFTS, ...EOA_ASSETS])
  const [contacts, setContacts] = useState<PersonObj[]>([...PEOPLE, ...EOA_PEOPLE])
  const [folders, setFolders] = useState<FolderSpec[]>(INITIAL_FOLDERS)
  /** Which folder windows are open — order is stacking order, last on top. */
  const [folderWins, setFolderWins] = useState<string[]>([])
  const [positions, setPositions] = useState<Record<string, Pos> | null>(null)
  const [wins, setWins] = useState<WinSpec[]>([])
  const [menu, setMenu] = useState<MenuSpec | null>(null)
  /** The desk's own right-click menu, tagged with the pane it was opened over. */
  const [deskMenu, setDeskMenu] = useState<{ x: number; y: number; wallet: Wallet } | null>(null)
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  /** One wallpaper per wallet — also what distinguishes the two panes in split view. */
  const [wallpapers, setWallpapers] = useState<Record<Wallet, Wallpaper>>(initialWallpapers)
  /** The top-right widget bento, per wallet. Both start with the Balance widget (the old fixed balance
   *  card) and the NFT collection stacked under it, and diverge from there — see `initialWidgets`. Not
   *  shown at all in split view: two bentos in two narrow panes would bury the desks they float over. */
  const [widgetsByWallet, setWidgetsByWallet] = useState<Record<Wallet, WidgetInstance[]>>(initialWidgets)
  /** The widget grid's live keep-out box, mirrored from the module value so a change can re-clamp icons. */
  const [keepout, setKeepout] = useState({ ...chromeKeepout })
  const [renamingId, setRenamingId] = useState<string | null>(null)
  /** Multi-select: the ids swept up by the marquee. Dragging any of them moves the whole set. */
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  /** Holdings currently wearing the detail card instead of their icon. Desktop only — see setDetailCard. */
  const [cardIds, setCardIds] = useState<ReadonlySet<string>>(new Set())
  /** The two halves of the freshest split — they flare yellow on the desk until the flash fades. */
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  /** Packs built with the Pack Builder — DOM tiles on the desk, like folders. */
  const [packs, setPacks] = useState<PackObj[]>([])
  /** The Pack Builder window: whose desk the pack lands on, optionally seeded with a dropped asset. */
  const [packBuilder, setPackBuilder] = useState<{ seed?: AssetObj; wallet: Wallet } | null>(null)
  /** The pack currently being unpacked. */
  const [unpacking, setUnpacking] = useState<PackObj | null>(null)
  /** The freshly-created pack — pulses a ring until it clears. */
  const [pulseId, setPulseId] = useState<string | null>(null)
  /** Standing approvals for the Approval Radar. */
  const [approvals, setApprovals] = useState<Approval[]>(APPROVAL_RADAR)
  /** The right-docked panel, if any — Inspector (on an object) or Approval Radar. One at a time. */
  const [rightPanel, setRightPanel] = useState<{ kind: "inspect"; id: string } | { kind: "radar" } | null>(null)
  /** The PackSpace Card modal — your own (contact undefined) or a saved contact's. */
  const [card, setCard] = useState<{ contact?: PersonObj } | null>(null)
  /** Settled receipts, newest first — the Receipts list reads these. */
  const [receipts, setReceipts] = useState<Receipt[]>([])
  /** The Receipts history list modal. */
  const [receiptsOpen, setReceiptsOpen] = useState(false)
  /** The ⌘K command palette — searches every inspectable object and opens the one you pick in the Inspector. */
  const [searchOpen, setSearchOpen] = useState(false)
  /** The desk's transient notice — a move MetaMask can't accept, an address copied across. Fades out.
   *  The id makes each notice its own React instance, so a second one replays the reveal instead of
   *  silently swapping the text inside the panel already on screen. */
  const [toast, setToast] = useState<{ id: number; tone: ToastTone; text: string } | null>(null)

  // drag — one object in hand, or a carried multi-selection; the store treats both as "dragging"
  const { obj: dragged, carriedIds, over } = useDrag()

  // data — the panes. One wallet on screen owns the whole viewport; split view halves it at the divider.
  const shownWallets = visibleWallets(view)
  const isSplit = view === "split"
  const panes: Record<Wallet, Pane> = useMemo(
    () => ({
      openfort: paneFor(view, "openfort", splitRatio, screen.w, screen.h),
      eoa: paneFor(view, "eoa", splitRatio, screen.w, screen.h)
    }),
    [view, splitRatio, screen.w, screen.h]
  )
  /** The wallet a single-desk action belongs to. In split view the desk menu names its own pane, so this
   *  is only the fallback for the handful of places that need one wallet and have no pointer to ask. */
  const activeWallet: Wallet = isSplit ? "openfort" : view
  /** Pane-relative → viewport, for an object whose wallet we know. */
  const toScreen = (wallet: Wallet, p: Pos): Pos => ({ x: panes[wallet].left + p.x, y: panes[wallet].top + p.y })
  /** Which pane a viewport x falls in. */
  const walletAt = (x: number): Wallet => walletAtX(view, splitRatio, screen.w, x)

  // data — what's ON the desk is everything not filed in a folder AND held by a wallet currently shown;
  // the flat lists keep everything, tagged with the wallet that holds it
  const folderedIds = new Set(folders.flatMap((f) => f.contents))
  const onScreen = new Set(shownWallets)
  const allItems: DesktopObj[] = [...assets, ...contacts]
  const deskItems: DesktopObj[] = allItems.filter((o) => onScreen.has(walletOf(o)) && !folderedIds.has(o.id))
  const deskFolders = folders.filter((f) => onScreen.has(f.wallet))
  const deskPacks = packs.filter((p) => onScreen.has(walletOf(p)))
  /** This desk's widgets — meaningless in split view, where the bento isn't drawn at all. */
  const widgets = widgetsByWallet[activeWallet]
  // what the 3D scene draws. A detail card carries its own flat art (a folder tile's treatment), so a
  // carded holding leaves the scene — otherwise its coin would have to sit either in front of the card's
  // glass or behind it, and neither reads right while the card is being dragged around.
  const drawn3d: DesktopObj[] = deskItems.filter((o) => !cardIds.has(o.id))
  // while inspecting an object the desk isn't drawing — filed in a folder, or wearing a card — put it back
  // in the scene so its coin can appear in the art card. It's the same object as any other, just elsewhere.
  const inspectHiddenId = rightPanel?.kind === "inspect" && !drawn3d.some((o) => o.id === rightPanel.id) ? rightPanel.id : null
  const sceneItems: DesktopObj[] = inspectHiddenId ? [...drawn3d, ...allItems.filter((o) => o.id === inspectHiddenId)] : drawn3d
  const draggedAsset = dragged?.class === "asset" ? dragged : null
  const carriedHasAsset = !!carriedIds && assets.some((a) => carriedIds.has(a.id))
  /** Whose desk the object(s) in hand came from — null when nothing is in hand. */
  const draggedWallet: Wallet | null = dragged ? walletOf(dragged) : carriedIds?.size ? walletOfId([...carriedIds][0]) : null
  /** Can an object on THIS desk be a drop target for what's in hand? Only its own desk's objects can:
   *  crossing the divider is a move between wallets, and offering a Send or a merge there would light up
   *  a target that the release then does something else with. */
  const takesDrop = (o: { wallet?: Wallet }) => draggedWallet === null || walletOf(o) === draggedWallet
  /** The same rule for a folder, which carries its wallet directly. */
  const folderTakesDrop = (f: FolderSpec) => draggedWallet === null || f.wallet === draggedWallet
  /** Whether the carry holds anything a folder could take — folders themselves never file. */
  const carriedHasFilable = !!carriedIds && [...carriedIds].some((id) => !folders.some((f) => f.id === id))
  const anyDragging = !!dragged || !!carriedIds
  // each folder's peek — its resolved contents, for the hover readout to glance inside without opening it
  const folderPeeks = folders.map((f) => ({
    id: f.id,
    label: f.label,
    items: f.contents.map((cid) => allItems.find((o) => o.id === cid)).filter((o): o is DesktopObj => !!o)
  }))

  // events — the desk's transient notice, then it gets out of the way on its own. Three tones, and the
  // distinction is what the reader can do about it: `error` is a hard impossibility (MetaMask cannot hold
  // a Solana token, ever), `alert` is a "not like that" with a way forward, `success` confirms something
  // that happened without asking first.
  const showToast = useCallback((tone: ToastTone, text: string) => {
    setToast({ id: toastIdc.current++, tone, text })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4600)
  }, [])

  // events — window manager (centered modals). Every modal blooms as it opens and errors as it closes;
  // the global press cue (installed on mount) covers every other button click.
  const close = (id: string) => {
    cue("error")
    setWins((w) => w.filter((x) => x.id !== id))
  }
  const open = useCallback((spec: WinDraft) => {
    cue("bloom")
    setWins((w) => {
      const ex = w.find((x) => x.matchKey === spec.matchKey)
      if (ex) return [...w.filter((x) => x !== ex), ex]
      return [...w, { ...spec, id: `w${idc.current++}` } as WinSpec]
    })
  }, [])

  // events — surface cues for the panels and full-screen modals that live outside the window manager.
  // Opens funnel through these, so a drop, a menu pick and a dock press all sound alike.
  const openReceipts = () => {
    cue("bloom")
    setReceiptsOpen(true)
  }
  const closeReceipts = () => {
    cue("error")
    setReceiptsOpen(false)
  }
  // a pack is built from one wallet's holdings and lands on that wallet's desk — a dropped seed names it,
  // otherwise it's the desk the builder was opened from
  const openPackBuilder = (seed?: AssetObj, wallet?: Wallet) => {
    cue("bloom")
    setPackBuilder({ seed, wallet: wallet ?? (seed ? walletOf(seed) : activeWallet) })
  }
  const closePackBuilder = () => {
    cue("error")
    setPackBuilder(null)
  }
  const openUnpack = (pack: PackObj) => {
    cue("bloom")
    setUnpacking(pack)
  }
  const closeUnpack = () => {
    cue("error")
    setUnpacking(null)
  }
  const closePanel = () => {
    cue("error")
    setRightPanel(null)
  }
  const openSearch = () => {
    cue("bloom")
    setSearchOpen(true)
  }
  const closeSearch = () => {
    cue("error")
    setSearchOpen(false)
  }
  const onSettle = useCallback(
    (receipt: Receipt) => {
      setReceipts((r) => [receipt, ...r])
      open({ kind: "receipt", receipt, matchKey: receipt.id })
    },
    [open]
  )

  // events — spend the given assets: deduct each fungible balance, remove NFTs sent whole, and drop
  // anything that emptied (from the desk, its position, and any folder holding it). Shared by Send and
  // Handoff, which differ only in what they file afterwards.
  const consumeAssets = useCallback((deals: SendDeal[]) => {
    const nftIds = new Set(deals.filter((d) => d.asset.kind === "nft").map((d) => d.asset.id))
    const gone = new Set([...nftIds, ...deals.filter((d) => d.asset.kind !== "nft" && d.asset.balance - d.amount <= 0).map((d) => d.asset.id)])
    setAssets((list) =>
      list
        .map((a) => {
          const deal = deals.find((d) => d.asset.id === a.id && a.kind !== "nft")
          if (!deal) return a
          const bal = Math.max(0, round4(a.balance - deal.amount))
          return { ...a, balance: bal, usd: (a.usd / a.balance) * bal }
        })
        .filter((a) => !gone.has(a.id))
    )
    if (gone.size) {
      setPositions((pos) => {
        if (!pos) return pos
        const next = { ...pos }
        for (const id of gone) delete next[id]
        return next
      })
      setFolders((list) => list.map((f) => ({ ...f, contents: f.contents.filter((c) => !gone.has(c)) })))
    }
  }, [])

  // events — a settled Send: consume the assets and file a receipt with the chain-aware Route row.
  // One-way, no counterparty confirmation.
  const applySend = useCallback(
    (deals: SendDeal[], to: PersonObj) => {
      cue("sparkle") // a settled transaction
      consumeAssets(deals)
      const give = deals.map((d) => (d.asset.kind === "nft" ? d.asset.label : `${units(d.amount)} ${d.asset.symbol}`)).join(" + ")
      const lead = deals[0].asset
      onSettle({
        id: `rcpt-send-${Date.now()}`,
        action: "Send",
        give,
        counterparty: to.label,
        chain: lead.chain ?? "Base",
        hash: fakeHash(`send-${to.id}-${give}`),
        confirmation: "One-way transfer",
        route: routeLine(lead, to),
        status: "Settled",
        at: new Date().toLocaleTimeString("en-US", { hour12: false })
      })
    },
    [consumeAssets, onSettle]
  )

  // events — a settled Handoff: consume what you gave, spawn the assets you received (which land on the
  // desk and pulse briefly like a fresh split), and file a Trade receipt noting both signatures.
  const applyHandoff = useCallback(
    (give: GiveSlot[], receive: HandoffReceive[], to: PersonObj) => {
      cue("sparkle") // a settled transaction
      consumeAssets(give.map((g) => ({ asset: g.asset, amount: g.amount })))

      // what comes back lands in the wallet that held the contact you traded with
      const wallet = walletOf(to)
      const received: AssetObj[] = receive.map((r, i) => ({
        id: `recv-${Date.now()}-${i}`,
        class: "asset",
        label: r.label,
        symbol: r.symbol,
        kind: r.symbol === "USDC" || r.symbol === "USDT" ? "stablecoin" : "token",
        balance: r.amount,
        usd: r.usd,
        chain: r.chain,
        color: r.color,
        wallet,
        derived: true
      }))
      if (received.length) {
        setAssets((list) => [...list, ...received])
        setPositions((pos) => {
          if (!pos) return pos
          const next = { ...pos }
          const pane = panesMirror[wallet]
          received.forEach((a, i) => {
            next[a.id] = nearestFreeSpot({ x: pane.width / 2 - ICON_W / 2 + i * 40, y: pane.height / 2 }, next, a.id, 0, wallet)
          })
          return next
        })
        const flash = new Set(received.map((a) => a.id))
        setFlashIds(flash)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashIds(new Set()), 2100)
      }

      const giveText = give.map((g) => (g.asset.kind === "nft" ? g.asset.label : `${units(g.amount)} ${g.asset.symbol}`)).join(" + ") || "Nothing"
      const receiveText = receive.map((r) => `${units(r.amount)} ${r.symbol}`).join(" + ")
      const chain = give[0]?.asset.chain ?? "Base"
      onSettle({
        id: `rcpt-trade-${Date.now()}`,
        action: "Trade",
        give: giveText,
        receive: receiveText || undefined,
        counterparty: to.label,
        chain,
        hash: fakeHash(`handoff-${to.id}-${giveText}-${receiveText}`),
        confirmation: "Both parties",
        route: isProjectG(to) ? "Atomic · multichain (Project G)" : `Atomic on ${chain}`,
        status: "Settled",
        at: new Date().toLocaleTimeString("en-US", { hour12: false })
      })
    },
    [consumeAssets, onSettle]
  )

  // events — Pack Builder. Create consumes the chosen contents and spawns a sealed pack that pulses
  // where it lands. Unpack releases the contents back onto the desk — fungibles merge into any matching
  // holding, everything else lands as a fresh object. A pack press that never travels opens it; a
  // travelling one repositions it.
  const createPack = (draft: PackDraft, wallet: Wallet) => {
    cue("sparkle") // a settled transaction
    const deals = draft.contents
      .map((c) => {
        const asset = assets.find((a) => a.id === c.refId)
        return asset ? { asset, amount: c.amount } : null
      })
      .filter((d): d is SendDeal => !!d)
    consumeAssets(deals)

    const id = `pack-${packIdc.current++}`
    const count = draft.contents.length
    const locked = draft.lock !== "None"
    const pack: PackObj = {
      id,
      class: "pack",
      label: draft.name,
      packClass: "product",
      packType: draft.packType,
      standard: draft.standard,
      packGlyph: locked ? "🔒" : "★",
      meta: `${count} item${count === 1 ? "" : "s"}`,
      contents: `${count} item${count === 1 ? "" : "s"}`,
      sealed: true,
      locked,
      lockKind: draft.lock,
      password: draft.password,
      items: draft.contents,
      usd: draft.contents.reduce((t, c) => t + c.usd, 0),
      color: draft.color,
      chain: "Base",
      wallet
    }
    setPacks((list) => [...list, pack])
    setPositions((pos) => {
      if (!pos) return pos
      const pane = panesMirror[wallet]
      const p = clampPos(pane.width / 2 - ICON_W / 2, pane.height / 2 - 120, id, wallet)
      return { ...pos, [id]: nearestFreeSpot(p, pos, id, 0, wallet) }
    })
    setPulseId(id)
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulseId((cur) => (cur === id ? null : cur)), 2400)
  }

  const unpackPack = (pack: PackObj) => {
    cue("sparkle") // a settled transaction
    const wallet = walletOf(pack)
    const pane = panesMirror[wallet]
    const items = pack.items ?? []
    const chosen = pack.packType === "Randomized" && items.length ? [items[Math.floor(Math.random() * items.length)]] : items
    const base = positions?.[pack.id] ?? { x: pane.width / 2, y: pane.height / 2 }

    const merges = new Map<string, { balance: number; usd: number }>()
    const fresh: AssetObj[] = []
    chosen.forEach((c, i) => {
      if (c.kind === "asset") {
        // contents pool back into a matching holding in the SAME wallet — the pack never crosses wallets
        const match = assets.find((a) => walletOf(a) === wallet && a.kind !== "nft" && a.symbol === c.symbol && a.chain === c.chain)
        if (match) {
          const m = merges.get(match.id) ?? { balance: 0, usd: 0 }
          merges.set(match.id, { balance: m.balance + c.amount, usd: m.usd + c.usd })
          return
        }
      }
      fresh.push({
        id: `unpack-${Date.now()}-${i}`,
        class: "asset",
        label: c.label,
        symbol: c.symbol,
        kind: c.kind === "nft" ? "nft" : c.symbol === "USDC" || c.symbol === "USDT" ? "stablecoin" : "token",
        balance: c.amount,
        usd: c.usd,
        chain: c.chain,
        color: c.color,
        wallet,
        derived: true
      })
    })

    setAssets((list) => [
      ...list.map((a) => {
        const m = merges.get(a.id)
        return m ? { ...a, balance: round4(a.balance + m.balance), usd: a.usd + m.usd } : a
      }),
      ...fresh
    ])
    setPacks((list) => list.filter((p) => p.id !== pack.id))
    setPositions((pos) => {
      if (!pos) return pos
      const { [pack.id]: gone, ...rest } = pos
      void gone
      fresh.forEach((a, i) => {
        rest[a.id] = nearestFreeSpot(clampPos(base.x + 30 + i * 28, base.y + i * 18, a.id, wallet), rest, a.id, 0, wallet)
      })
      return rest
    })
    if (fresh.length) {
      setFlashIds(new Set(fresh.map((a) => a.id)))
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlashIds(new Set()), 2100)
    }
  }

  const startPackDrag = (pack: PackObj) => (e: React.PointerEvent) => {
    if (e.button !== 0 || !positions) return
    const local = positions[pack.id]
    if (!local) return
    // moved in viewport coordinates, stored back pane-relative — the same trick the folder drag uses
    const wallet = walletOf(pack)
    const origin = toScreen(wallet, local)
    const sx = e.clientX
    const sy = e.clientY
    packMovedRef.current = false
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!packMovedRef.current && Math.hypot(dx, dy) < 6) return
      packMovedRef.current = true
      const el = iconNodes.current.get(pack.id)
      if (el) {
        el.style.left = `${origin.x + dx}px`
        el.style.top = `${origin.y + dy}px`
      }
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      // a press that never travelled is a click, not a move — opening is the double-click's job
      if (!packMovedRef.current) return
      const pane = panes[wallet]
      const p = clampPos(origin.x + ev.clientX - sx - pane.left, origin.y + ev.clientY - sy - pane.top, pack.id, wallet)
      setPositions((pos) => (pos ? { ...pos, [pack.id]: nearestFreeSpot(p, pos, pack.id, 0, wallet) } : pos))
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // events — moving an object between your own two wallets: the split view's cross-divider drop. Not a
  // Send — nothing leaves your custody — so it opens the Move window rather than the transfer flow, and
  // MetaMask's EVM-only rule is checked before the window ever appears.
  const startMove = (obj: DesktopObj, to: Wallet) => {
    const from = walletOf(obj)
    const blocked = moveBlockMessage(obj, to)
    if (blocked) {
      cue("error")
      showToast("error", blocked)
      return
    }
    // an address isn't a holding — nothing is spent, nothing settles, and it's just as useful in both
    // address books. So it COPIES across on release: no amount to pick, nothing to confirm, no receipt.
    if (obj.class === "person") return copyContactTo(obj, to)

    // a fungible landing where the same token is already held can pool with it
    const existing =
      obj.kind !== "nft" ? (assets.find((a) => walletOf(a) === to && a.kind !== "nft" && a.symbol === obj.symbol && a.chain === obj.chain) ?? null) : null
    open({ kind: "move", asset: obj, from, to, existing, matchKey: `move-${obj.id}-${to}` })
  }

  /** Copy a saved address onto the other wallet's desk. The original stays put — an address book entry
   *  is a note about someone else, and both wallets can reasonably hold the same one. Already got it?
   *  Say so rather than landing a duplicate. */
  const copyContactTo = (contact: PersonObj, to: Wallet) => {
    const already = contacts.some((c) => walletOf(c) === to && (c.address ? c.address === contact.address : c.label === contact.label))
    if (already) {
      cue("error")
      showToast("alert", `${contact.label} is already in your ${walletLabel(to)} address book.`)
      return
    }
    cue("whisper")
    // the copy needs its own object id, but it's the same person — so it inherits the original's face
    // rather than resolving its new id against the avatar map and landing on the default
    const copy: PersonObj = {
      ...contact,
      id: `${contact.id}-${to}-${contactIdc.current++}`,
      avatarKey: contact.avatarKey ?? contact.id,
      wallet: to
    }
    const pane = panesMirror[to]
    setContacts((list) => [...list, copy])
    setPositions((pos) => {
      if (!pos) return pos
      // takes the same spot on the far desk as the original holds on this one, so the two read as the
      // same address in two books rather than something that moved
      const at = pos[contact.id]
      const want = at ? { x: at.x, y: at.y } : { x: pane.width / 2 - ICON_W / 2, y: pane.height / 2 }
      return { ...pos, [copy.id]: nearestFreeSpot(want, pos, copy.id, 0, to) }
    })
    showToast("success", `Copied ${contact.label} to your ${walletLabel(to)} address book.`)
  }

  /** Settle a move: the holding changes wallet and takes a fresh slot on the far desk. A part-move of a
   *  fungible splits the balance instead, leaving the remainder behind; pooling folds it into the holding
   *  already over there rather than landing a second pile of the same token. */
  const applyMove = (asset: AssetObj, to: Wallet, amount: number, mergeIntoId: string | null) => {
    cue("sparkle") // a settled transaction
    const from = walletOf(asset)
    const pane = panesMirror[to]
    const whole = asset.kind === "nft" || amount >= asset.balance
    const landedId = mergeIntoId ?? (whole ? asset.id : `mv-${assetIdc.current++}`)
    const rate = asset.usd / asset.balance

    setAssets((list) => {
      // moved whole, and not pooling: the same object simply changes desks
      if (whole && !mergeIntoId) return list.map((a) => (a.id === asset.id ? { ...a, wallet: to } : a))

      const kept = round4(asset.balance - amount)
      const withSource = list.map((a) => (a.id === asset.id ? { ...a, balance: kept, usd: kept * rate } : a)).filter((a) => a.id !== asset.id || kept > 0)
      if (mergeIntoId) return withSource.map((a) => (a.id === mergeIntoId ? { ...a, balance: round4(a.balance + amount), usd: a.usd + amount * rate } : a))
      const i = withSource.findIndex((a) => a.id === asset.id)
      const moved: AssetObj = { ...asset, id: landedId, wallet: to, balance: amount, usd: amount * rate, derived: true }
      return i < 0 ? [...withSource, moved] : [...withSource.slice(0, i + 1), moved, ...withSource.slice(i + 1)]
    })

    setPositions((pos) => {
      if (!pos) return pos
      const next = { ...pos }
      // a whole move takes the holding off this desk entirely — either it reappears on the far one under
      // the same id, or it was poured into a holding already there and is gone
      if (whole) delete next[asset.id]
      if (!mergeIntoId) next[landedId] = nearestFreeSpot({ x: pane.width / 2 - ICON_W / 2, y: pane.height / 2 }, next, landedId, 0, to)
      return next
    })
    // a holding that moved out of a folder's wallet can't stay filed there
    if (whole) setFolders((list) => list.map((f) => (f.wallet === from ? { ...f, contents: f.contents.filter((c) => c !== asset.id) } : f)))

    const what = asset.kind === "nft" ? asset.label : `${units(amount)} ${asset.symbol}`
    onSettle({
      id: `rcpt-move-${Date.now()}`,
      action: "Move",
      give: what,
      counterparty: walletLabel(to),
      chain: asset.chain ?? "Base",
      hash: fakeHash(`move-${asset.id}-${to}-${amount}`),
      confirmation: "Internal · same owner",
      route: mergeIntoId ? `${walletLabel(from)} → ${walletLabel(to)} · pooled` : `${walletLabel(from)} → ${walletLabel(to)}`,
      status: "Settled",
      at: new Date().toLocaleTimeString("en-US", { hour12: false })
    })
  }

  // events — placement. Letting go IS the placement gesture; (x, y) is the cursor, which carried the
  // coin's centre, so the icon lands with its slot centred there (pushed aside if something's already
  // sitting there). A release in the OTHER wallet's pane isn't a placement at all — it's a move.
  const moveObject = (obj: DesktopObj, x: number, y: number) => {
    const target = walletAt(x)
    const home = walletOf(obj)
    if (target !== home) {
      pulledFromFolder.current.delete(obj.id)
      return startMove(obj, target)
    }
    if (pulledFromFolder.current.delete(obj.id)) cue("whisper") // pulled out of a folder and set down on the desk
    const pane = panes[home]
    const p = clampPos(x - pane.left - ICON_W / 2, y - pane.top - ICON_PAD - ICON_SLOT / 2, obj.id)
    setPositions((pos) => (pos ? { ...pos, [obj.id]: nearestFreeSpot(p, pos, obj.id) } : pos))
  }

  // events — the detail card. Writing the module mirror and the state together is what keeps the layout
  // maths honest: `clampPos` and friends run on the drag's hot path and read `detailCardIds` directly, so
  // every change to the set has to go through here.
  const applyCardIds = useCallback((next: ReadonlySet<string>) => {
    detailCardIds.clear()
    for (const id of next) detailCardIds.add(id)
    setCardIds(next)
  }, [])

  /** Swap a holding between its icon and its detail card. The object keeps its centre — the card grows
   *  out around where the icon stood rather than jumping — and then steps aside if that much wider
   *  footprint has landed on a neighbour. */
  const setDetailCard = (id: string, on: boolean) => {
    const next = new Set(cardIds)
    if (on) next.add(id)
    else next.delete(id)
    applyCardIds(next)
    // the mirror is already updated, so clampPos/nearestFreeSpot below size this object as its NEW form
    setPositions((pos) => {
      const at = pos?.[id]
      if (!pos || !at) return pos
      const from = on ? ICON_BOX : CARD_BOX
      const to = on ? CARD_BOX : ICON_BOX
      const p = clampPos(at.x + (from.w - to.w) / 2, at.y + (from.h - to.h) / 2, id)
      return { ...pos, [id]: nearestFreeSpot(p, pos, id) }
    })
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
    cue("sparkle") // a settled transaction
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
    cue("sparkle") // a settled transaction
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
    // this drop landed on a zone (a folder, a wallet, a dock app), not the bare desk — so it isn't
    // "taken out of the folder"; drop the pulled-out flag without the remove whisper
    pulledFromFolder.current.delete(obj.id)
    const home = walletOf(obj)
    const pane = panes[home]

    // the dock is viewport chrome straddling both panes in split view, so it's read BEFORE the pane the
    // cursor happens to be over — otherwise dropping a MetaMask asset on the dock's left half would be
    // taken for a move to Openfort
    const navId = navDropId(dropKey)
    const settleBeside = () => {
      // the icon was carried to the drop point and can't stay ON its target — settle it beside, with the
      // same push-away any overlapping placement gets
      const p = clampPos(coinView.cursor.x - pane.left - ICON_W / 2, coinView.cursor.y - pane.top - ICON_PAD - ICON_SLOT / 2, obj.id)
      setPositions((pos) => (pos ? { ...pos, [obj.id]: nearestFreeSpot(p, pos, obj.id) } : pos))
    }
    if (navId) {
      settleBeside()
      if (obj.class === "person") return
      if (navId === "nav-builder" && obj.class === "asset") openPackBuilder(obj)
      else if (navId === "nav-inspector") openInspector(obj.id)
      return
    }

    // released over the OTHER wallet's half: that's a move between your own wallets, whatever zone
    // happened to be under the cursor there
    const landed = walletAt(coinView.cursor.x)
    if (landed !== home) return startMove(obj, landed)

    settleBeside()

    // a folder takes anything except another folder — filed away, off the desk
    const intoFolder = folderDropId(dropKey)
    if (intoFolder) {
      if (!folders.find((f) => f.id === intoFolder)?.contents.includes(obj.id)) cue("whisper") // an item filed into a folder
      setFolders((list) => list.map((f) => (f.id === intoFolder && !f.contents.includes(obj.id) ? { ...f, contents: [...f.contents, obj.id] } : f)))
      return
    }
    // beyond folders, a wallet drag recognises no zones (deleting lives in its menu) — it only lands
    if (obj.class === "person") return
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
        if (home) setFolders((list) => list.map((f) => (f.id === home.id && !f.contents.includes(obj.id) ? { ...f, contents: [...f.contents, obj.id] } : f)))
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
    // folders sweep up too — a selection is for organising, and folders are furniture worth moving. Boxes
    // are taken in viewport coordinates, since that's what the sweep is drawn in.
    const boxes = [
      ...deskItems.map((o) => ({ id: o.id, p: positions[o.id] && toScreen(walletOf(o), positions[o.id]) })),
      ...deskFolders.map((f) => ({ id: f.id, p: positions[f.id] && toScreen(f.wallet, positions[f.id]) }))
    ].filter((b): b is { id: string; p: Pos } => !!b.p)
    setSelectedIds(new Set())

    const onSweep = (ev: PointerEvent) => {
      const x0 = Math.min(sx, ev.clientX)
      const y0 = Math.min(sy, ev.clientY)
      const x1 = Math.max(sx, ev.clientX)
      const y1 = Math.max(sy, ev.clientY)
      setMarquee({ x0: sx, y0: sy, x1: ev.clientX, y1: ev.clientY })
      setSelectedIds(
        new Set(
          boxes
            .filter(({ id, p }) => {
              const b = boxOf(id)
              return p.x < x1 && p.x + b.w > x0 && p.y < y1 && p.y + b.h > y0
            })
            .map(({ id }) => id)
        )
      )
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
      /** Origins are held in VIEWPORT coordinates, not pane-relative ones: the carry moves wrappers and
       *  hit-tests against the cursor, both of which speak viewport. They convert back to pane-relative
       *  only when the handful is finally set down. */
      let origins: Map<string, Pos> | null = null
      if (!opts.materialize) {
        origins = new Map()
        for (const id of ids) {
          const p = positions[id]
          if (p) origins.set(id, toScreen(walletOfId(id), p))
        }
      }

      /** The desk this handful came off. A selection is always swept out of one pane, so one wallet
       *  describes the lot — and nothing on the other desk can be a target for it. */
      const carryWallet = walletOfId(ids[0])

      /** The contact under (x, y), if any — found by geometry. Filed or carried contacts can't be hit,
       *  and neither can one on the other wallet's desk (that release is a move, not a transfer). */
      const contactAt = (x: number, y: number) =>
        contacts.find((c) => {
          if (ids.includes(c.id) || folderedIds.has(c.id) || walletOf(c) !== carryWallet) return false
          const local = positions[c.id]
          if (!local) return false
          const p = toScreen(walletOf(c), local)
          return x >= p.x && x <= p.x + ICON_W && y >= p.y && y <= p.y + ICON_SLOT + ICON_FOOT
        })

      /** The folder under (x, y) — the desk icon by geometry, or an open folder window through the
       *  DOM (the carried icons are pointer-transparent, so elementFromPoint sees past them). A folder
       *  that's itself being carried, or one on the other desk, can't be a target. */
      const folderAt = (x: number, y: number): string | null => {
        if (!hasFilable) return null
        const icon = folders.find((f) => {
          if (ids.includes(f.id) || f.wallet !== carryWallet) return false
          const local = positions[f.id]
          if (!local) return false
          const p = toScreen(f.wallet, local)
          return x >= p.x && x <= p.x + ICON_W && y >= p.y && y <= p.y + ICON_SLOT + ICON_FOOT
        })
        if (icon) return icon.id
        const key = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-drop]")?.getAttribute("data-drop")
        const id = key ? folderDropId(key) : null
        return id && !ids.includes(id) && folders.find((f) => f.id === id)?.wallet === carryWallet ? id : null
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

        /** Viewport → this object's own pane, for setting a carried member back down. */
        const land = (id: string, x: number, y: number) => {
          const pane = panes[walletOfId(id)]
          return clampPos(x - pane.left, y - pane.top, id)
        }

        // filed: the handful disappears into the folder — except any folders riding along, which can
        // never be filed and settle beside the target instead
        if (hitFolder) {
          const fileIds = [...org.keys()].filter((id) => !folderIdSet.has(id))
          if (fileIds.length) cue("whisper") // a handful filed into a folder
          setFolders((list) => list.map((f) => (f.id === hitFolder ? { ...f, contents: [...new Set([...f.contents, ...fileIds])] } : f)))
          const carriedFolders = [...org].filter(([id]) => folderIdSet.has(id))
          if (carriedFolders.length) {
            setPositions((pos) => {
              if (!pos) return pos
              const next = { ...pos }
              for (const [id, o] of carriedFolders) next[id] = nearestFreeSpot(land(id, o.x + dx, o.y + dy), next, id)
              return next
            })
          }
          return
        }

        // a handful released over the other wallet's half: moving between wallets is a one-object
        // decision (each needs its own amount and its own EVM check), so the set clamps back onto its
        // own desk below and says why. The dock is exempt — it straddles both panes by design.
        if (isSplit && !hitNav && walletAt(ev.clientX) !== carryWallet) {
          cue("error")
          showToast("alert", `A selection can't cross to ${walletLabel(walletAt(ev.clientX))} in one go — move the objects over individually.`)
        }

        // a folder pull (materialize provided) that ends anywhere but a folder or a contact has been
        // taken out onto the desk — that's the remove whisper; a plain desk multi-select drag is silent
        if (opts.materialize && !hitContact) cue("whisper")

        setPositions((pos) => {
          if (!pos) return pos
          const next = { ...pos }
          // a drop can't stay ON its target, and a pulled stack spreads out — both scatter to clear spots
          if (hitContact || opts.settle === "spread") {
            for (const [id, o] of org) next[id] = nearestFreeSpot(land(id, o.x + dx, o.y + dy), next, id)
            return next
          }
          // formation holds: nudge the whole handful by one shared offset so it lands clear of resting
          // icons without losing its shape (single drags get the same push-away via nearestFreeSpot)
          const carried = new Set(org.keys())
          const desired = [...org].map(([id, o]) => ({ id, p: land(id, o.x + dx, o.y + dy) }))
          const off = nearestFreeGroupOffset(desired, pos, carried)
          if (off) {
            for (const d of desired) next[d.id] = clampPos(d.p.x + off.x, d.p.y + off.y, d.id)
          } else {
            // no offset keeps the formation clear (dropped against the widgets / dock / an edge) — scatter
            // each to its own free spot rather than collapsing the handful into a stack
            for (const d of desired) next[d.id] = nearestFreeSpot(d.p, next, d.id)
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
    // a detail card is carried, not picked up by its coin: the icon drag re-centres the object on the
    // cursor, which would snap a 280px-wide card sideways the instant it started moving. The carry moves
    // by delta instead, so the card stays under the point you grabbed — and still sees every drop zone.
    if (cardIds.has(obj.id)) return startCarry([obj.id], { settle: "formation" })(e)
    onPointerDown(obj)(e)
  }

  // events — desk housekeeping (the desktop's own right-click menu). The last-used arrangement is
  // remembered so a window resize can re-run it: an icon layout tuned to one width is wrong at another.
  const cleanupKeyRef = useRef<"name" | "kind" | "value" | null>(null)
  // merged over the old map, not swapped in: defaultPositions only knows the stock objects, and a
  // wholesale replace would strand any user-made folders without a position. Foldered objects are
  // skipped — they hold no desk slot while filed. One wallet's desk at a time: tidying Openfort must
  // leave MetaMask's arrangement exactly as it was.
  const cleanUpWallet = (wallet: Wallet, assetOrder = assets, contactOrder = contacts) =>
    setPositions((pos) => {
      const top = isSplit ? SPLIT_TOP : TOP
      const next = {
        ...pos,
        ...defaultPositions(
          assetOrder.filter((a) => walletOf(a) === wallet && !folderedIds.has(a.id)),
          contactOrder.filter((c) => walletOf(c) === wallet && !folderedIds.has(c.id)),
          folders.filter((f) => f.wallet === wallet).map((f) => f.id),
          panesMirror[wallet],
          top
        )
      }
      // a detail card is far wider and taller than a grid slot, so the tidy would sit it on top of the two
      // or three icons around it. Lay the grid out first, then walk each card out to the nearest spot that
      // clears them — never upward past the grid's top, or it reverses out and parks over the greeting.
      for (const id of cardIds) {
        const at = next[id]
        if (at && walletOfId(id) === wallet) next[id] = nearestFreeSpot(at, next, id, top)
      }
      return next
    })
  /** Tidy every desk that's on screen. A resize or a divider drag changes both panes at once. */
  const cleanUp = (assetOrder = assets, contactOrder = contacts) => {
    for (const w of shownWallets) cleanUpWallet(w, assetOrder, contactOrder)
  }
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
   *  it's saved, so closing the window leaves no orphan icon behind. It joins whichever desk the menu
   *  was opened on. */
  const addContact = (at: Pos, wallet: Wallet) => {
    const draft: PersonObj = {
      id: `p-new-${contactIdc.current++}`,
      class: "person",
      label: "New Contact",
      handle: "unconfirmed",
      trust: "unconfirmed",
      hue: Math.floor(Math.random() * 360),
      chain: CONNECTED_NETWORK,
      wallet
    }
    open({ kind: "new-contact", draft, at, wallet, matchKey: "new-contact" })
  }
  /** A fresh folder lands right where the menu was opened, pushed aside like any placement — and
   *  arrives already renaming, the way a fresh folder should. */
  const addFolder = (at: Pos, wallet: Wallet) => {
    const id = `folder-new-${folderIdc.current++}`
    const pane = panes[wallet]
    setFolders((list) => [...list, { id, label: "New Folder", wallet, contents: [] }])
    setPositions((pos) => {
      if (!pos) return pos
      const p = clampPos(at.x - pane.left - ICON_W / 2, at.y - pane.top - ICON_PAD - ICON_SLOT / 2, id, wallet)
      return { ...pos, [id]: nearestFreeSpot(p, pos, id, 0, wallet) }
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
  const openFolderWindow = (id: string) => {
    if (!folderWins.includes(id)) cue("bloom") // an already-open folder is only being focused, not opened
    setFolderWins((w) => (w.includes(id) ? [...w.filter((x) => x !== id), id] : [...w, id]))
  }
  const closeFolderWindow = (id: string) => {
    if (folderWins.includes(id)) cue("error")
    setFolderWins((w) => w.filter((x) => x !== id))
  }

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
            const wallet = folders.find((f) => f.id === folderId)?.wallet ?? activeWallet
            const pane = panes[wallet]
            setFolders((list) => list.map((f) => (f.id === folderId ? { ...f, contents: f.contents.filter((cid) => !idSet.has(cid)) } : f)))
            // pane-relative for the desk's own record, viewport for the carry that's about to move them
            const local = new Map<string, Pos>()
            group.forEach((o, i) =>
              local.set(o.id, clampPos(x - pane.left - ICON_W / 2 + i * 14, y - pane.top - ICON_PAD - ICON_SLOT / 2 + i * 10, o.id, wallet))
            )
            setPositions((pos) => (pos ? { ...pos, ...Object.fromEntries(local) } : pos))
            return new Map([...local].map(([id, p]) => [id, toScreen(wallet, p)]))
          }
        }
      )(e)
    }

    onPointerDown(obj, {
      onStart: (x, y) => {
        pulledFromFolder.current.add(obj.id) // whispers on release, but only if it lands on the desk
        const pane = panes[walletOf(obj)]
        setFolders((list) => list.map((f) => (f.id === folderId ? { ...f, contents: f.contents.filter((cid) => cid !== obj.id) } : f)))
        setPositions((pos) => (pos ? { ...pos, [obj.id]: clampPos(x - pane.left - ICON_W / 2, y - pane.top - ICON_PAD - ICON_SLOT / 2, obj.id) } : pos))
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
    const local = positions[id]
    if (!local) return
    // the wrapper is moved in viewport coordinates and the result stored back pane-relative
    const wallet = folders.find((f) => f.id === id)?.wallet ?? activeWallet
    const origin = toScreen(wallet, local)
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
      // a folder is desk furniture, not a holding — there's nothing to settle, and its contents may not
      // all be welcome on the far desk (MetaMask takes no Solana). It stays put and says what to do.
      if (walletAt(ev.clientX) !== wallet) {
        const folder = folders.find((f) => f.id === id)
        cue("error")
        showToast(
          "alert",
          `"${folder?.label ?? "That folder"}" can't move to ${walletLabel(walletAt(ev.clientX))} as one — open it and drag the assets across individually.`
        )
      }
      const pane = panes[wallet]
      const p = clampPos(origin.x + ev.clientX - sx - pane.left, origin.y + ev.clientY - sy - pane.top, id, wallet)
      setPositions((pos) => (pos ? { ...pos, [id]: nearestFreeSpot(p, pos, id, 0, wallet) } : pos))
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }
  const onFolderOpen = (id: string) => () => {
    // that gesture was a move, not an open
    if (folderMovedRef.current) return
    openFolderWindow(id)
  }

  const createContact = (draft: PersonObj, patch: Pick<PersonObj, "label" | "handle" | "address">, at: Pos, wallet: Wallet) => {
    const contact = { ...draft, ...patch, wallet }
    const pane = panes[wallet]
    setContacts((list) => [...list, contact])
    setPositions((pos) => {
      if (!pos) return pos
      const p = clampPos(at.x - pane.left - ICON_W / 2, at.y - pane.top - ICON_PAD - ICON_SLOT / 2, contact.id, wallet)
      return { ...pos, [contact.id]: nearestFreeSpot(p, pos, contact.id, 0, wallet) }
    })
  }

  // events — Inspector & Approval Radar. Verifying / confirming / whitelisting are simple state flips;
  // revoking removes the approval and its linked scam token from the desk.
  const inspectableById = (id: string): Inspectable | null =>
    assets.find((a) => a.id === id) ?? contacts.find((c) => c.id === id) ?? packs.find((p) => p.id === id) ?? null

  const openInspector = (id?: string) => {
    const target = id ?? assets[0]?.id
    if (target) {
      cue("bloom")
      setRightPanel({ kind: "inspect", id: target })
    }
  }

  // the ordered set of inspectable objects the Inspector can move between (arrow keys, or a future list),
  // and the lighter "jump to this one" — no open-bloom, just swap which object is shown
  const inspectList = useMemo(() => [...assets, ...contacts, ...packs], [assets, contacts, packs])
  const selectInspect = useCallback((id: string) => setRightPanel({ kind: "inspect", id }), [])
  const openRadar = () => {
    cue("bloom")
    setRightPanel({ kind: "radar" })
  }

  const removeAssetObject = (id: string) => {
    setAssets((list) => list.filter((a) => a.id !== id))
    setPositions((pos) => {
      if (!pos) return pos
      const { [id]: gone, ...rest } = pos
      void gone
      return rest
    })
    setFolders((list) => list.map((f) => ({ ...f, contents: f.contents.filter((c) => c !== id) })))
  }
  const revokeApprovalEntry = (apId: string) => {
    const ap = approvals.find((a) => a.id === apId)
    setApprovals((list) => list.filter((a) => a.id !== apId))
    if (ap?.assetId) removeAssetObject(ap.assetId)
  }
  const revokeToken = (assetId: string) => {
    removeAssetObject(assetId)
    setApprovals((list) => list.filter((a) => a.assetId !== assetId))
  }
  const verifyAsset = (id: string) => setAssets((list) => list.map((a) => (a.id === id ? { ...a, verified: true } : a)))
  const confirmContact = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, trust: "confirmed" } : c)))
  const whitelistAddress = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, whitelisted: true } : c)))

  // events — address lifecycle. Retired warns before a send; compromised blocks it. Clearing restores
  // Active. The two flags are mutually exclusive.
  const markRetired = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, retired: true, compromised: false } : c)))
  const markCompromised = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, compromised: true, retired: false } : c)))
  const clearFlags = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, retired: false, compromised: false } : c)))

  // events — reset the demo to its pristine layout, balances, contacts, packs, approvals and receipts.
  const resetDemo = () => {
    const startAssets = [...ASSETS, ...DUST_ASSETS, ...DUST_NFTS, ...EOA_ASSETS]
    const startPeople = [...PEOPLE, ...EOA_PEOPLE]
    const filed = new Set(INITIAL_FOLDERS.flatMap((f) => f.contents))
    setAssets(startAssets)
    setContacts(startPeople)
    setFolders(INITIAL_FOLDERS)
    setPacks([])
    setApprovals(APPROVAL_RADAR)
    setReceipts([])
    setWins([])
    setFolderWins([])
    setRightPanel(null)
    setCard(null)
    setPackBuilder(null)
    setUnpacking(null)
    setReceiptsOpen(false)
    setPulseId(null)
    setSelectedIds(new Set())
    setToast(null)
    applyCardIds(new Set())
    // both desks go back to their stock bento and wallpaper too — the whole workspace, not just this half
    setWidgetsByWallet(initialWidgets())
    setWallpapers(initialWallpapers())
    // laid out at full width for each wallet, then pulled back into the panes if the split is open
    const full: Pane = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    const seeded: Record<string, Pos> = {}
    for (const wallet of WALLET_ORDER) {
      Object.assign(
        seeded,
        defaultPositions(
          startAssets.filter((a) => walletOf(a) === wallet && !filed.has(a.id)),
          startPeople.filter((c) => walletOf(c) === wallet),
          INITIAL_FOLDERS.filter((f) => f.wallet === wallet).map((f) => f.id),
          full,
          TOP
        )
      )
    }
    setPositions(seeded)
    if (isSplit) requestAnimationFrame(() => settleIntoPanes(true))
  }

  const onInspectAction = (kind: string) => {
    if (rightPanel?.kind !== "inspect") return
    const obj = inspectableById(rightPanel.id)
    if (!obj) return
    if (kind === "split" && obj.class === "asset") return startSplit(obj)
    // like Split, the pack builder opens ON TOP of the bento takeover — the inspector stays open beneath it
    if (kind === "add-to-pack" && obj.class === "asset") return openPackBuilder(obj)
    if (kind === "revoke") {
      revokeToken(obj.id)
      return setRightPanel(null)
    }
    if (kind === "verify") return verifyAsset(obj.id)
    if (kind === "unpack" && obj.class === "pack") {
      openUnpack(obj)
      return setRightPanel(null)
    }
    if (kind === "whitelist") return whitelistAddress(obj.id)
    if (kind === "confirm") return confirmContact(obj.id)
    // contact actions — open on top of the bento, like Split (the inspector stays open beneath)
    if (kind === "view-card" && obj.class === "person") return openCard(obj)
    if (kind === "edit" && obj.class === "person") return open({ kind: "contact", contact: obj, matchKey: `contact-${obj.id}` })
  }

  // events — PackSpace Card. Open your own or a contact's; importing a pasted link / @handle / 0x
  // address mints an unconfirmed contact on the desk (a confirmation ping, in fiction).
  const openCard = (contact?: PersonObj) => {
    cue("bloom")
    setCard({ contact })
  }
  const closeCard = () => {
    cue("error")
    setCard(null)
  }
  const importContact = (text: string) => {
    const t = text.trim()
    if (!t) return
    const isAddr = /^0x/i.test(t)
    const isHandle = t.startsWith("@")
    const contact: PersonObj = {
      id: `p-import-${contactIdc.current++}`,
      class: "person",
      label: isHandle ? t : isAddr ? "Imported contact" : t,
      handle: "unconfirmed",
      trust: "unconfirmed",
      hue: Math.floor(Math.random() * 360),
      chain: CONNECTED_NETWORK,
      platform: "external",
      whitelisted: true,
      wallet: activeWallet,
      address: isAddr ? (t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-3)}` : t) : undefined
    }
    const pane = panes[activeWallet]
    setContacts((list) => [...list, contact])
    setPositions((pos) => {
      if (!pos) return pos
      const p = clampPos(pane.width / 2 - ICON_W / 2, pane.height / 2, contact.id, activeWallet)
      return { ...pos, [contact.id]: nearestFreeSpot(p, pos, contact.id, 0, activeWallet) }
    })
  }

  // events — right-click. Icons take their own menu; the desk itself takes housekeeping. Every object
  // gets a menu now (an NFT can't split but can be inspected); the browser menu is suppressed either
  // way — this is a desktop, not a document.
  const onIconMenu = (obj: DesktopObj) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // the desk's own menu listens underneath
    cue("tick") // a context menu opening — a crisp menu tick, not the modal bloom
    setDeskMenu(null)
    setFolderMenu(null)
    setMenu({ x: e.clientX, y: e.clientY, obj })
  }
  const onFolderMenu = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cue("tick")
    setMenu(null)
    setDeskMenu(null)
    setFolderMenu({ x: e.clientX, y: e.clientY, id })
  }
  const onDeskMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    cue("tick")
    setMenu(null)
    setFolderMenu(null)
    setDeskMenu({ x: e.clientX, y: e.clientY, wallet: walletAt(e.clientX) })
  }

  const menuItems = (obj: DesktopObj): DesktopMenuItem[] => {
    if (obj.class === "asset") {
      // Inspect with AI leads every object menu, for consistency; then the object-specific actions
      const items: DesktopMenuItem[] = [{ label: "Inspect with AI", icon: Search, onSelect: () => openInspector(obj.id) }]
      // the detail card is a full-desk view — a folder tile has no room for one, and neither does a split
      // pane, so neither is offered it (and filing one, or opening the split, drops it back to an icon)
      if (!folderedIds.has(obj.id) && !isSplit) {
        const card = cardIds.has(obj.id)
        items.push({
          label: card ? "Show as icon" : "Show detail card",
          icon: card ? Minimize2 : Maximize2,
          onSelect: () => setDetailCard(obj.id, !card)
        })
      }
      // a fresh scam token can't be split, but every asset can be inspected, revoked or verified
      if (isSplittable(obj) && obj.verified !== false) items.push({ label: "Split asset", icon: Scissors, onSelect: () => startSplit(obj) })
      if (obj.approval) items.push({ label: "Revoke approval", icon: Ban, danger: true, onSelect: () => revokeToken(obj.id) })
      if (obj.verified === false) items.push({ label: "Add to verified list", icon: ShieldCheck, onSelect: () => verifyAsset(obj.id) })
      return items
    }
    const unknown = obj.whitelisted === false
    const flagged = !!obj.retired || !!obj.compromised
    const items: DesktopMenuItem[] = [{ label: "Inspect with AI", icon: Search, onSelect: () => openInspector(obj.id) }]
    if (unknown) items.push({ label: "Add to address book", icon: UserPlus, onSelect: () => whitelistAddress(obj.id) })
    items.push({ label: "View PackSpace Card", icon: CreditCard, onSelect: () => openCard(obj) })
    if (!unknown) {
      items.push({ label: "Rename", icon: Pencil, separator: true, onSelect: () => setRenamingId(obj.id) })
      items.push({ label: "Edit", icon: SquarePen, onSelect: () => open({ kind: "contact", contact: obj, matchKey: `contact-${obj.id}` }) })
      if (!flagged && obj.trust === "unconfirmed")
        items.push({ label: "Confirm contact", icon: BadgeCheck, separator: true, onSelect: () => confirmContact(obj.id) })
      if (flagged) items.push({ label: "Clear flag · set Active", icon: BadgeCheck, separator: true, onSelect: () => clearFlags(obj.id) })
      if (!obj.retired) items.push({ label: "Mark as Retired", icon: History, onSelect: () => markRetired(obj.id) })
      if (!obj.compromised) items.push({ label: "Mark as Compromised", icon: ShieldX, danger: true, onSelect: () => markCompromised(obj.id) })
    }
    // same confirm as the trash — permanent is permanent, whichever gesture asked
    items.push({
      label: "Delete",
      icon: Trash2,
      danger: true,
      separator: true,
      onSelect: () => open({ kind: "delete-contact", contact: obj, matchKey: `delete-${obj.id}` })
    })
    return items
  }

  // events — right-clicking a search result opens that object's ordinary desktop menu at the cursor,
  // raised over the palette (the menu's z-940 sits above the palette's z-210). Packs carry no desk menu,
  // so a right-click on one does nothing here either — same as on the desk.
  const onSearchItemMenu = (obj: SearchItem, e: React.MouseEvent) => {
    e.preventDefault()
    if (obj.class === "pack") return
    e.stopPropagation()
    cue("tick")
    setDeskMenu(null)
    setFolderMenu(null)
    setMenu({ x: e.clientX, y: e.clientY, obj, fromSearch: true })
  }
  // a search menu's actions dismiss the palette first, so a window or the Inspector they open isn't left
  // hidden behind it (the palette sits above those layers). Cancelling the menu just leaves the palette up.
  const searchMenuItems = (obj: DesktopObj): DesktopMenuItem[] =>
    menuItems(obj).map((it) => {
      const sel = it.onSelect
      if (!sel) return it
      return {
        ...it,
        onSelect: () => {
          setSearchOpen(false)
          sel()
        }
      }
    })

  // no confirm on folder delete: nothing is destroyed — the contents just spill back onto the desk
  const folderMenuItems = (id: string): DesktopMenuItem[] => [
    { label: "Rename", icon: Pencil, onSelect: () => setRenamingId(id) },
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => deleteFolder(id) }
  ]
  // widgets — a fresh one takes its type's default span and lands at the end of that wallet's bento. One
  // of each type per desk, so a type already on the grid is a no-op. Each wallet's arrangement is its
  // own: adding, resizing or removing here can't touch the other desk's bento.
  const addWidget = (type: WidgetType, wallet: Wallet = activeWallet) => {
    const span = WIDGET_TYPES.find((w) => w.type === type)?.defaultSpan ?? 1
    setWidgetsByWallet((all) => {
      const ws = all[wallet]
      if (ws.some((w) => w.type === type)) return all
      return { ...all, [wallet]: [...ws, { id: `widget-${wallet}-${widgetIdc.current++}-${type}`, type, span }] }
    })
  }
  /** The active desk's bento, as the grid's setter wants it. */
  const setActiveWidgets = useCallback(
    (updater: (ws: WidgetInstance[]) => WidgetInstance[]) => setWidgetsByWallet((all) => ({ ...all, [activeWallet]: updater(all[activeWallet]) })),
    [activeWallet]
  )

  // widgets — the grid reports its footprint; mirror it into the module value the clamp reads (hot path)
  // and into state, so a change re-runs the icon-reclamp effect below
  const onKeepoutChange = useCallback((w: number, h: number) => {
    chromeKeepout.w = w
    chromeKeepout.h = h
    setKeepout((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
  }, [])

  // the desk's own menu acts on the desk it was opened over — in split view that's whichever pane the
  // right-click landed in, so each half creates, tidies and re-papers itself independently
  const deskMenuItems = (at: Pos, wallet: Wallet): DesktopMenuItem[] => {
    // one of each widget type only — offer just the ones not already on that desk's grid, and drop the
    // item entirely once every type is placed (or in split view, where there's no bento to add to)
    const addable = isSplit ? [] : WIDGET_TYPES.filter((t) => !widgetsByWallet[wallet].some((w) => w.type === t.type))
    const byName = (a: DesktopObj, b: DesktopObj) => a.label.localeCompare(b.label)
    const tidy = (key: "name" | "kind" | "value") => {
      cleanupKeyRef.current = key
      const sorted = [...assets].sort(
        key === "name" ? byName : key === "value" ? (a, b) => b.usd - a.usd : (a, b) => a.kind.localeCompare(b.kind) || b.usd - a.usd
      )
      cleanUpWallet(wallet, sorted, key === "name" ? [...contacts].sort(byName) : contacts)
    }
    return [
      { label: "New Contact", icon: UserPlus, onSelect: () => addContact(at, wallet) },
      { label: "New Folder", icon: FolderPlus, onSelect: () => addFolder(at, wallet) },
      ...(addable.length
        ? [
            {
              label: "Add Widget",
              icon: Plus,
              children: addable.map((t) => ({ label: t.label, onSelect: () => addWidget(t.type, wallet) }))
            } as DesktopMenuItem
          ]
        : []),
      {
        label: "Change Wallpaper",
        icon: ImageIcon,
        children: WALLPAPERS.map((w) => ({
          label: w.label,
          checked: w.label === wallpapers[wallet].label,
          onSelect: () => setWallpapers((all) => ({ ...all, [wallet]: w }))
        }))
      },
      {
        label: "Clean Up",
        icon: LayoutGrid,
        separator: true,
        onSelect: () => {
          cleanupKeyRef.current = null
          cleanUpWallet(wallet)
        }
      },
      {
        label: "Clean Up By",
        icon: ArrowDownUp,
        children: [
          { label: "Name", onSelect: () => tidy("name") },
          { label: "Kind", onSelect: () => tidy("kind") },
          { label: "Value", onSelect: () => tidy("value") }
        ]
      }
    ]
  }

  // effects — the desktop is the surface the resting objects clip to
  useEffect(() => {
    if (!rootRef.current) return
    return registerCoinViewport(rootRef.current)
  }, [])

  // effects — one document-wide listener that knocks (press) on every button click, except the
  // opens/closes that already sound their own bloom/error
  useEffect(() => installPressCues(), [])

  // effects — keep the module mirrors the layout maths reads in step with state. A layout effect, so it
  // lands before the browser paints and long before any pointer handler could consult them. Declared
  // ahead of everything that clamps so the ordering is never in question.
  useLayoutEffect(() => {
    objectWallet.clear()
    for (const a of assets) objectWallet.set(a.id, walletOf(a))
    for (const c of contacts) objectWallet.set(c.id, walletOf(c))
    for (const f of folders) objectWallet.set(f.id, f.wallet)
    for (const p of packs) objectWallet.set(p.id, walletOf(p))
    for (const w of WALLET_ORDER) Object.assign(panesMirror[w], panes[w])
  }, [assets, contacts, folders, packs, panes])

  // effects — the top-right keep-out. The widget grid reports its own box while it's on screen; split
  // view has no bento, so the clamp falls back to the box the floating search / view chrome occupies.
  useEffect(() => {
    if (!isSplit) return
    chromeKeepout.w = SPLIT_KEEPOUT.w
    chromeKeepout.h = SPLIT_KEEPOUT.h
    setKeepout({ ...SPLIT_KEEPOUT })
  }, [isSplit])

  // effects — the starting arrangement needs the viewport's size, which the server doesn't have. Both
  // wallets' desks are seeded at full width: that's the pane each gets in its own single-wallet view, and
  // opening the split re-clamps them into the halves. Foldered objects take no slot.
  useEffect(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    setScreen({ w, h })

    const filed = new Set(INITIAL_FOLDERS.flatMap((f) => f.contents))
    const full: Pane = { left: 0, top: 0, width: w, height: h }
    const startAssets = [...ASSETS, ...DUST_ASSETS, ...DUST_NFTS, ...EOA_ASSETS]
    const startPeople = [...PEOPLE, ...EOA_PEOPLE]
    const seeded: Record<string, Pos> = {}
    for (const wallet of WALLET_ORDER) {
      Object.assign(
        seeded,
        defaultPositions(
          startAssets.filter((a) => walletOf(a) === wallet && !filed.has(a.id)),
          startPeople.filter((c) => walletOf(c) === wallet),
          INITIAL_FOLDERS.filter((f) => f.wallet === wallet).map((f) => f.id),
          full,
          TOP
        )
      )
    }
    setPositions(seeded)
  }, [])

  /** Pull every object back inside its own wallet's pane after the panes change shape. `settle` also runs
   *  the collision search, so nothing ends up stacked — worth doing once when a view opens, but not on
   *  every frame of a divider drag, where the plain clamp reads as the icons sliding in from the edge. */
  const settleIntoPanes = useCallback((settle: boolean) => {
    setPositions((pos) => {
      if (!pos) return pos
      const clamped: Record<string, Pos> = {}
      for (const [id, p] of Object.entries(pos)) clamped[id] = clampPos(p.x, p.y, id)
      if (!settle) return clamped
      // each object placed against the ones already down, so a shrunken pane spreads them instead of
      // piling them against its edge
      const settled: Record<string, Pos> = {}
      for (const [id, p] of Object.entries(clamped)) settled[id] = nearestFreeSpot(p, settled, id)
      return settled
    })
  }, [])

  // effects — the view switched: both desks changed shape, so everything comes back inside its own pane.
  //
  // Squeezing a full-width desk into half the screen is lossy — everything bunches up against the
  // divider, and simply widening the pane again won't spread it back out. So the full-screen arrangement
  // is put aside on the way into split view and restored on the way out, leaving split view free to keep
  // an arrangement of its own. Objects minted or spent while the split was open aren't in the saved map,
  // so they keep whatever spot they earned.
  //
  // The flag tells the keep-out effect below to stand down — showing or hiding the bento moves the
  // keep-out box, but a view switch must not be answered with a full re-tidy that wipes the arrangement.
  const prevViewRef = useRef(view)
  const viewSwitchRef = useRef(false)
  const positionsBeforeSplitRef = useRef<Record<string, Pos> | null>(null)
  useEffect(() => {
    if (prevViewRef.current === view) return
    const leavingSplit = prevViewRef.current === "split"
    prevViewRef.current = view
    viewSwitchRef.current = true

    if (view === "split") {
      positionsBeforeSplitRef.current = positions
    } else if (leavingSplit && positionsBeforeSplitRef.current) {
      const saved = positionsBeforeSplitRef.current
      positionsBeforeSplitRef.current = null
      setPositions((pos) => {
        if (!pos) return saved
        const next = { ...pos }
        // only for objects still on the books — anything spent or revoked in split view stays gone
        for (const [id, p] of Object.entries(saved)) if (id in pos) next[id] = p
        return next
      })
    }
    settleIntoPanes(true)
  }, [view, positions, settleIntoPanes])

  // effects — the divider moved. Clamp live (cheap, and it reads as the icons being pushed along by the
  // divider); the collision pass waits for the drag to end — see `onRatioCommit`.
  useEffect(() => {
    if (!isSplit) return
    settleIntoPanes(false)
  }, [splitRatio, isSplit, settleIntoPanes])

  // effects — detail cards are a full-desk view: 280px of card doesn't fit a split pane. They collapse
  // back to icons on the way in and are put back exactly as they were on the way out.
  const cardsBeforeSplitRef = useRef<ReadonlySet<string>>(new Set())
  const prevSplitRef = useRef(isSplit)
  useEffect(() => {
    if (prevSplitRef.current === isSplit) return
    prevSplitRef.current = isSplit
    if (isSplit) {
      cardsBeforeSplitRef.current = cardIds
      if (cardIds.size) applyCardIds(new Set())
      return
    }
    if (cardsBeforeSplitRef.current.size) applyCardIds(cardsBeforeSplitRef.current)
    cardsBeforeSplitRef.current = new Set()
  }, [isSplit, cardIds, applyCardIds])

  // effects — when the widget grid's keep-out changes (a widget added, resized, or removed), re-tidy the
  // desk so the contact grid drops below (or reclaims space above) the new footprint as one uniform block
  // rather than scattering. Skips the first run — the seeding effect above owns the initial layout, and it
  // already reads the freshly-measured keep-out. Depends only on the box (not positions), so the relayout
  // it triggers doesn't feed back into it.
  const seededKeepoutRef = useRef(false)
  useEffect(() => {
    if (!seededKeepoutRef.current) {
      seededKeepoutRef.current = true
      return
    }
    // this change is the bento appearing or disappearing with the view, not a widget being edited — the
    // view switch has already re-clamped every desk, and a tidy here would throw the arrangement away
    if (viewSwitchRef.current) {
      viewSwitchRef.current = false
      return
    }
    relayoutRef.current()
  }, [keepout])

  // effects — the detail card is a desktop-only view, so the set is pruned to what's actually on the desk:
  // filing a card into a folder drops it back to an icon, and an object that leaves entirely (spent,
  // revoked, combined away) takes its card with it. Every path that files or removes goes through here
  // rather than each remembering to clear the flag itself.
  useEffect(() => {
    if (!cardIds.size) return
    const live = new Set([...cardIds].filter((id) => !folderedIds.has(id) && assets.some((a) => a.id === id)))
    if (live.size !== cardIds.size) applyCardIds(live)
    // folderedIds is rebuilt every render from `folders`, which is the dependency that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIds, folders, assets, applyCardIds])

  // effects — a resize re-runs the last clean-up (the plain one, or whichever "Clean Up By" was used
  // last). The listener reads through a ref so it always sees the current assets and contacts without
  // re-registering on every change.
  const relayoutRef = useRef(() => {})
  useEffect(() => {
    relayoutRef.current = () => (cleanupKeyRef.current ? cleanUpBy(cleanupKeyRef.current) : cleanUp())
  })
  useEffect(() => {
    const onResize = () => {
      setScreen({ w: window.innerWidth, h: window.innerHeight })
      relayoutRef.current()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // effects — ⌘K / Ctrl+K opens the search palette from anywhere on the desk
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // effects — Escape closes only the TOPMOST overlay, so a modal stacked over the Inspector (Split, Add
  // to Pack, a contact's Card…) closes on its own without taking the Inspector down with it. The checks
  // run highest-z first; the first open layer consumes the key and nothing beneath it is touched. The
  // right-click menus own their own Escape (DesktopMenu) but are still guarded here so the key can't fall
  // through them to a layer below. Read through a ref so the one listener always sees current state.
  const escapeRef = useRef(() => {})
  useEffect(() => {
    escapeRef.current = () => {
      if (menu || deskMenu || folderMenu) {
        setMenu(null)
        setDeskMenu(null)
        setFolderMenu(null)
        return
      }
      if (packBuilder) return closePackBuilder() // z-220 full-screen modals
      if (unpacking) return closeUnpack()
      if (card) return closeCard()
      if (receiptsOpen) return closeReceipts()
      if (rightPanel?.kind === "radar") return closePanel()
      if (searchOpen) return closeSearch() // z-210
      if (wins.length) return close(wins[wins.length - 1].id) // z-200+, last opened sits on top
      if (rightPanel?.kind === "inspect") return closePanel() // z-190 Inspect with AI
      if (folderWins.length) return closeFolderWindow(folderWins[folderWins.length - 1]) // z-100+ desk windows
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") escapeRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // effects — the split-flash, pack-pulse and toast timers must not fire into an unmounted tree
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
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
      // stored pane-relative, written to the DOM in viewport coordinates
      const v = toScreen(walletOfId(id), p)
      el.style.left = `${v.x}px`
      el.style.top = `${v.y}px`
    }
  })

  return (
    <>
      {/* the wallpaper is its own bottom layer, so the greeting (painted next) shows over it while
          still sitting under every icon, coin and badge. In split view the two panes bring their own,
          divided at the divider. */}
      {isSplit ? (
        <DesktopPanes
          panes={panes}
          wallpapers={{ openfort: wallpapers.openfort.css, eoa: wallpapers.eoa.css }}
          ratio={splitRatio}
          onRatioChange={setSplitRatio}
          onRatioCommit={() => settleIntoPanes(true)}
        />
      ) : (
        <div aria-hidden className="fixed inset-0" style={{ background: wallpapers[activeWallet].css }} />
      )}

      <DesktopBar onSearch={openSearch} view={view} onViewChange={setView} />
      {/* the bento belongs to one desk at a time — in split view neither is drawn, so the two halves
          aren't buried under widgets sized for a full screen */}
      {!isSplit && (
        <Widget
          widgets={widgets}
          setWidgets={setActiveWidgets}
          assets={assets.filter((a) => walletOf(a) === activeWallet)}
          wallet={activeWallet}
          onAdd={addWidget}
          onKeepoutChange={onKeepoutChange}
        />
      )}

      {/* icon positions are viewport coordinates, so this layer must be the viewport — offsetting it
          (say, below the bar) would land every drop that offset away from the cursor. The clamp is what
          keeps icons out from under the bar, not the container. It owns the desk's own right-click
          menu; the wallpaper lives on the underlay above so the greeting can slot between them. */}
      <div ref={rootRef} className="absolute inset-0" onContextMenu={onDeskMenu} onPointerDown={onDeskPointerDown}>
        {positions &&
          assets.map((a) => {
            const local = positions[a.id]
            if (!local || folderedIds.has(a.id) || !onScreen.has(walletOf(a))) return null
            const p = toScreen(walletOf(a), local)
            return (
              <div
                key={a.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(a.id, el)
                  else iconNodes.current.delete(a.id)
                }}
                // in hand: above everything on the desk — folder windows included — and
                // pointer-transparent so the drop hit-testing sees the zones underneath
                data-cue-press
                className={cn("absolute", (dragged?.id === a.id || carriedIds?.has(a.id)) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                {cardIds.has(a.id) ? (
                  <DesktopDetailCard
                    obj={a}
                    // the same merge-target rule the icon follows, so a card still takes a matching portion
                    dropKey={draggedAsset && takesDrop(a) && canCombine(draggedAsset, a) ? assetDropKey(a.id) : undefined}
                    dimmed={!!draggedAsset && !isSameToken(draggedAsset, a)}
                    target={!!draggedAsset && takesDrop(a) && canCombine(draggedAsset, a)}
                    over={!!draggedAsset && over === assetDropKey(a.id)}
                    selected={menu?.obj.id === a.id || selectedIds.has(a.id)}
                    flash={flashIds.has(a.id)}
                    onPointerDown={onIconPointerDown(a)}
                    onDoubleClick={() => openInspector(a.id)}
                    onContextMenu={onIconMenu(a)}
                    onCollapse={() => setDetailCard(a.id, false)}
                  />
                ) : (
                  <DesktopIcon
                    obj={a}
                    label={desktopLabel(a)}
                    // only a valid merge target carries a drop key, so a drop can never land where it can't resolve
                    dropKey={draggedAsset && takesDrop(a) && canCombine(draggedAsset, a) ? assetDropKey(a.id) : undefined}
                    dimmed={!!draggedAsset && !isSameToken(draggedAsset, a)}
                    target={!!draggedAsset && takesDrop(a) && canCombine(draggedAsset, a)}
                    over={!!draggedAsset && over === assetDropKey(a.id)}
                    selected={menu?.obj.id === a.id || selectedIds.has(a.id)}
                    flash={flashIds.has(a.id)}
                    anyDragging={anyDragging}
                    onPointerDown={onIconPointerDown(a)}
                    onDoubleClick={() => openInspector(a.id)}
                    onContextMenu={onIconMenu(a)}
                  />
                )}
              </div>
            )
          })}

        {positions &&
          contacts.map((c) => {
            const local = positions[c.id]
            if (!local || folderedIds.has(c.id) || !onScreen.has(walletOf(c))) return null
            const p = toScreen(walletOf(c), local)
            return (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(c.id, el)
                  else iconNodes.current.delete(c.id)
                }}
                data-cue-press
                className={cn("absolute", (dragged?.id === c.id || carriedIds?.has(c.id)) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopIcon
                  obj={c}
                  label={desktopLabel(c)}
                  dropKey={takesDrop(c) ? walletDropKey(c.id) : undefined}
                  target={takesDrop(c) && (!!draggedAsset || (carriedHasAsset && !carriedIds?.has(c.id)))}
                  over={(!!draggedAsset || carriedHasAsset) && over === walletDropKey(c.id)}
                  selected={menu?.obj.id === c.id || selectedIds.has(c.id)}
                  anyDragging={anyDragging}
                  renaming={renamingId === c.id}
                  onRename={(name) => renameContact(c.id, name)}
                  onRenameCancel={() => setRenamingId(null)}
                  onPointerDown={onIconPointerDown(c)}
                  onDoubleClick={() => openInspector(c.id)}
                  onContextMenu={onIconMenu(c)}
                />
              </div>
            )
          })}

        {/* the folders — Other Tokens plus any the desk menu created. Click opens the window, drag
            moves, and anything in hand (except another folder) can be filed onto them */}
        {positions &&
          deskFolders.map((f) => {
            const local = positions[f.id]
            if (!local) return null
            const p = toScreen(f.wallet, local)
            return (
              <div
                key={f.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(f.id, el)
                  else iconNodes.current.delete(f.id)
                }}
                data-cue-press
                className={cn("absolute", carriedIds?.has(f.id) && "pointer-events-none z-[160]")}
                style={{ left: p.x, top: p.y }}>
                <DesktopFolder
                  id={f.id}
                  label={f.label}
                  count={f.contents.length}
                  dropKey={dragged && folderTakesDrop(f) ? folderDropKey(f.id) : undefined}
                  target={folderTakesDrop(f) && (!!dragged || carriedHasFilable) && !carriedIds?.has(f.id)}
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

        {/* the packs — DOM tiles like folders. Click to unpack, drag to move; a fresh one pulses. */}
        {positions &&
          deskPacks.map((pack) => {
            const local = positions[pack.id]
            if (!local) return null
            const p = toScreen(walletOf(pack), local)
            return (
              <div
                key={pack.id}
                ref={(el) => {
                  if (el) iconNodes.current.set(pack.id, el)
                  else iconNodes.current.delete(pack.id)
                }}
                data-cue-press
                className="absolute"
                style={{ left: p.x, top: p.y }}>
                <DesktopPack
                  pack={pack}
                  pulse={pulseId === pack.id}
                  onPointerDown={startPackDrag(pack)}
                  onDoubleClick={() => openUnpack(pack)}
                  onContextMenu={(e) => e.preventDefault()}
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
      <DesktopDock
        carriedAsset={carriedHasAsset}
        onOpen={(id) => {
          if (id === "nav-builder") openPackBuilder()
          else if (id === "nav-inspector") openInspector()
          else if (id === "nav-approvals") openRadar()
          else if (id === "nav-cards") openCard()
          else if (id === "nav-receipts") openReceipts()
          else if (id === "nav-reset") resetDemo()
        }}
      />

      {/* the 3D objects — draws into the slots the icons above registered (plus a filed object being inspected) */}
      <ObjectScene items={sceneItems} nav={NAV_ITEMS} />

      {/* open folders — windows, not modals: the desk stays live around them. Stacking follows the
          open/focus order; they sit above the resting canvas (z-50) and under the modals (z-200+). */}
      {folderWins.map((id, i) => {
        const f = folders.find((x) => x.id === id)
        if (!f) return null
        const items = f.contents.map((cid) => allItems.find((o) => o.id === cid)).filter((o): o is DesktopObj => !!o)
        return (
          <WindowFolder
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
            itemDropKey={(o) => (draggedAsset && takesDrop(o) && o.class === "asset" && canCombine(draggedAsset, o) ? assetDropKey(o.id) : undefined)}
            itemDimmed={(o) => !!draggedAsset && o.class === "asset" && !isSameToken(draggedAsset, o)}
            overKey={over}
          />
        )
      })}

      {/* modals */}
      {wins.map((w, i) => {
        const z = 200 + i
        if (w.kind === "transfer")
          return (
            <WindowTransfer
              key={w.id}
              assets={w.assets}
              // a Handoff can only stake what the wallet holding this contact actually holds
              inventory={assets.filter((a) => walletOf(a) === walletOf(w.to))}
              to={w.to}
              z={z}
              onClose={() => close(w.id)}
              onSend={applySend}
              onLaunch={applyHandoff}
            />
          )
        if (w.kind === "split") return <WindowSplit key={w.id} asset={w.asset} z={z} onClose={() => close(w.id)} onSplit={(p) => splitAsset(w.asset, p)} />
        if (w.kind === "combine")
          return <WindowCombine key={w.id} a={w.a} b={w.b} z={z} onClose={() => close(w.id)} onCombine={() => combineAssets(w.a, w.b)} />
        if (w.kind === "contact")
          return <WindowContact key={w.id} contact={w.contact} z={z} onClose={() => close(w.id)} onSave={(patch) => saveContact(w.contact.id, patch)} />
        if (w.kind === "new-contact")
          return (
            <WindowContact
              key={w.id}
              contact={w.draft}
              create
              z={z}
              onClose={() => close(w.id)}
              onSave={(patch) => createContact(w.draft, patch, w.at, w.wallet)}
            />
          )
        if (w.kind === "delete-contact")
          return <WindowDelete key={w.id} contact={w.contact} z={z} onClose={() => close(w.id)} onConfirm={() => deleteContact(w.contact.id)} />
        if (w.kind === "move")
          return (
            <WindowMove
              key={w.id}
              asset={w.asset}
              from={w.from}
              to={w.to}
              existing={w.existing}
              z={z}
              onClose={() => close(w.id)}
              onMove={(amount, mergeIntoId) => applyMove(w.asset, w.to, amount, mergeIntoId)}
            />
          )
        return <WindowReceipt key={w.id} receipt={w.receipt} z={z} onClose={() => close(w.id)} />
      })}

      {/* Pack Builder + Unpack — full-screen glass modals over the desk. The builder only ever sees the
          holdings of the wallet whose desk it was opened from. */}
      {packBuilder && (
        <WindowPackBuilder
          inventory={assets.filter((a) => walletOf(a) === packBuilder.wallet)}
          seed={packBuilder.seed}
          onClose={closePackBuilder}
          onCreate={(draft) => createPack(draft, packBuilder.wallet)}
        />
      )}
      {unpacking && <WindowUnpack pack={unpacking} onClose={closeUnpack} onUnpack={unpackPack} />}
      {card && <WindowCard contact={card.contact} onImport={importContact} onClose={closeCard} />}
      {receiptsOpen && <WindowReceipts receipts={receipts} onOpen={(r) => open({ kind: "receipt", receipt: r, matchKey: r.id })} onClose={closeReceipts} />}

      {/* the Approval Radar stays a right-docked panel; the AI Inspector is a full-screen bento takeover */}
      {rightPanel?.kind === "radar" && <PanelApprovals approvals={approvals} onRevoke={revokeApprovalEntry} onClose={closePanel} />}
      {rightPanel?.kind === "inspect" && inspectableById(rightPanel.id) && (
        <PanelInspector
          obj={inspectableById(rightPanel.id)!}
          objects={inspectList}
          coinPresent={inspectableById(rightPanel.id)!.class !== "pack"}
          // no coin on the desk to fly from — filed away, wearing a detail card, or held by a wallet this
          // view isn't showing (the search palette reaches all of them) — so it drops straight in
          foldered={folderedIds.has(rightPanel.id) || cardIds.has(rightPanel.id) || !onScreen.has(walletOfId(rightPanel.id))}
          wallpaper={wallpapers[walletOfId(rightPanel.id)].css}
          onAction={onInspectAction}
          onSelect={selectInspect}
          onClose={closePanel}
        />
      )}

      {/* the right-click menus — an icon's own, or the desk's housekeeping */}
      {menu && <DesktopMenu x={menu.x} y={menu.y} items={menu.fromSearch ? searchMenuItems(menu.obj) : menuItems(menu.obj)} onClose={() => setMenu(null)} />}
      {deskMenu && <DesktopMenu x={deskMenu.x} y={deskMenu.y} items={deskMenuItems(deskMenu, deskMenu.wallet)} onClose={() => setDeskMenu(null)} />}
      {folderMenu && <DesktopMenu x={folderMenu.x} y={folderMenu.y} items={folderMenuItems(folderMenu.id)} onClose={() => setFolderMenu(null)} />}

      <DesktopHover items={deskItems} folders={folderPeeks} />

      {/* the desk's transient notice — sits 12px above the dock, clear of the modals, and takes itself
          away. Tone says whether it's a hard no, a "not like that", or something that just happened.
          Keyed by notice, so a new one while another is up remounts and plays the reveal again rather
          than quietly changing the words in place. */}
      {toast && (
        <DesktopToast key={toast.id} tone={toast.tone}>
          {toast.text}
        </DesktopToast>
      )}

      {/* ⌘K search — reaches every inspectable object (even dust filed in a folder), then hands the pick
          to the AI Inspector */}
      {searchOpen && (
        <DesktopSearch
          items={[...assets, ...packs, ...contacts]}
          onClose={closeSearch}
          onSelect={(id) => openInspector(id)}
          onItemContextMenu={onSearchItemMenu}
        />
      )}
    </>
  )
}
