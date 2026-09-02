"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { CONNECTED_NETWORK } from "@/const/app-config"
import { SPLIT_KEEPOUT, WALLPAPERS, type Wallpaper, initialWallpapers, initialWidgets } from "@/const/desktop-config"
import {
  CARD_BOX,
  COL_W,
  ICON_BOX,
  ICON_FOOT,
  ICON_PAD,
  ICON_SLOT,
  ICON_W,
  type Pos,
  ROW_H,
  SPLIT_TOP,
  TOP,
  clampPos,
  defaultPositions,
  nearestFreeGroupOffset,
  nearestFreeSpot
} from "@/const/desktop-layout"
import { type Pane, paneFor, walletAtX } from "@/const/pane"
import { useDesktopDrag } from "@/hooks/useDesktopDrag"
import { useDesktopFlash } from "@/hooks/useDesktopFlash"
import { useDesktopMarquee } from "@/hooks/useDesktopMarquee"
import { useDesktopPulse } from "@/hooks/useDesktopPulse"
import { useDesktopSettlement } from "@/hooks/useDesktopSettlement"
import { useDesktopSurfaces } from "@/hooks/useDesktopSurfaces"
import { useDesktopToast } from "@/hooks/useDesktopToast"
import { chromeKeepout } from "@/stores/chrome-keepout"
import { coinView, registerCoinViewport, setCoinHover } from "@/stores/coin"
import { panesMirror, setDetailCards, setObjectWallets, setPanes, walletOfId } from "@/stores/desk"
import { endDrag, setOver, startGroupDrag, useDrag } from "@/stores/drag"
import type { Approval, AssetObj, DesktopObj, FolderSpec, PackObj, PersonObj } from "@/types/objects"
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
  assetKindFor,
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
import { dragLoop } from "@/lib/drag-loop"
import type { Inspectable } from "@/lib/inspect"
import { cue, installPressCues } from "@/lib/sound"
import { cn, desktopLabel, round4 } from "@/lib/utils"
import { type View, WALLET_ORDER, type Wallet, moveBlockMessage, visibleWallets, walletLabel, walletOf } from "@/lib/wallets"
import { WIDGET_TYPES, type WidgetInstance, type WidgetType } from "@/lib/widgets"

import { APPROVAL_RADAR } from "@/data/approvals"
import { NAV_ITEMS } from "@/data/apps"
import { ASSETS, DUST_ASSETS, DUST_NFTS, EOA_ASSETS } from "@/data/assets"
import { INITIAL_FOLDERS } from "@/data/folders"
import { EOA_PEOPLE, PEOPLE } from "@/data/people"

import { DesktopBar } from "./DesktopBar"
import { DesktopDetailCard } from "./DesktopDetailCard"
import { DesktopDock, dropTileAt } from "./DesktopDock"
import { DesktopFolder } from "./DesktopFolder"
import { DesktopHover } from "./DesktopHover"
import { DesktopIcon } from "./DesktopIcon"
import { DesktopMenu, type DesktopMenuItem } from "./DesktopMenu"
import { DesktopPack } from "./DesktopPack"
import { DesktopPanes } from "./DesktopPanes"
import { DesktopSearch, type SearchItem } from "./DesktopSearch"
import { DesktopToast } from "./DesktopToast"

const ObjectScene = dynamic(() => import("@/components/desktop/object/ObjectScene").then((m) => m.ObjectScene), { ssr: false })
type MenuSpec = { x: number; y: number; obj: DesktopObj; fromSearch?: boolean }
type TidyKey = "name" | "kind" | "value"

/** An object sitting on the desk: registered with the node map the drag writes through, lifted above
 *  everything (folder windows included) and made pointer-transparent while it is in hand, so the drop
 *  hit-testing sees the zones underneath. Positioned in viewport coordinates — the layout effect re-pins
 *  it after every render. Module-level, so the desk's re-renders never remount what it holds. */
function Placed({
  id,
  at,
  nodes,
  carried = false,
  children
}: {
  id: string
  at: Pos
  nodes: Map<string, HTMLElement>
  carried?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      ref={(el) => {
        if (el) nodes.set(id, el)
        else nodes.delete(id)
      }}
      data-cue-press
      className={cn("absolute", carried && "pointer-events-none z-[160]")}
      style={{ left: at.x, top: at.y }}>
      {children}
    </div>
  )
}

export function Desktop() {
  // refs
  const rootRef = useRef<HTMLDivElement>(null)
  const assetIdc = useRef(0)
  const contactIdc = useRef(0)
  const folderIdc = useRef(0)
  const packIdc = useRef(0)
  const widgetIdc = useRef(0)
  const iconNodes = useRef(new Map<string, HTMLElement>())
  const pulledFromFolder = useRef(new Set<string>())

  // state
  const [view, setView] = useState<View>("openfort")
  const [splitRatio, setSplitRatio] = useState(0.5)

  const [screen, setScreen] = useState({ w: 0, h: 0 })

  // state
  const [assets, setAssets] = useState<AssetObj[]>([...ASSETS, ...DUST_ASSETS, ...DUST_NFTS, ...EOA_ASSETS])
  const [contacts, setContacts] = useState<PersonObj[]>([...PEOPLE, ...EOA_PEOPLE])
  const [folders, setFolders] = useState<FolderSpec[]>(INITIAL_FOLDERS)
  const [folderWins, setFolderWins] = useState<string[]>([])
  const [positions, setPositions] = useState<Record<string, Pos> | null>(null)
  const [menu, setMenu] = useState<MenuSpec | null>(null)
  const [deskMenu, setDeskMenu] = useState<{ x: number; y: number; wallet: Wallet } | null>(null)
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [wallpapers, setWallpapers] = useState<Record<Wallet, Wallpaper>>(initialWallpapers)
  const [widgetsByWallet, setWidgetsByWallet] = useState<Record<Wallet, WidgetInstance[]>>(initialWidgets)
  const [keepout, setKeepout] = useState({ ...chromeKeepout })
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [cardIds, setCardIds] = useState<ReadonlySet<string>>(new Set())
  const [packs, setPacks] = useState<PackObj[]>([])
  const [approvals, setApprovals] = useState<Approval[]>(APPROVAL_RADAR)

  // drag
  const { obj: dragged, carriedIds, over } = useDrag()

  // data
  const shownWallets = visibleWallets(view)
  const isSplit = view === "split"
  const panes: Record<Wallet, Pane> = useMemo(
    () => ({
      openfort: paneFor(view, "openfort", splitRatio, screen.w, screen.h),
      eoa: paneFor(view, "eoa", splitRatio, screen.w, screen.h)
    }),
    [view, splitRatio, screen.w, screen.h]
  )
  const activeWallet: Wallet = isSplit ? "openfort" : view

  const toScreen = (wallet: Wallet, p: Pos): Pos => ({ x: panes[wallet].left + p.x, y: panes[wallet].top + p.y })
  const walletAt = (x: number): Wallet => walletAtX(view, splitRatio, screen.w, x)

  // data
  const folderedIds = new Set(folders.flatMap((f) => f.contents))
  const onScreen = new Set(shownWallets)
  const allItems: DesktopObj[] = [...assets, ...contacts]
  const deskItems: DesktopObj[] = allItems.filter((o) => onScreen.has(walletOf(o)) && !folderedIds.has(o.id))
  const deskFolders = folders.filter((f) => onScreen.has(f.wallet))
  const deskPacks = packs.filter((p) => onScreen.has(walletOf(p)))

  // hooks
  // declared here rather than above the data block because each needs values derived from it
  const {
    wins,
    open,
    close,
    receipts,
    onSettle,
    receiptsOpen,
    openReceipts,
    closeReceipts,
    packBuilder,
    openPackBuilder,
    closePackBuilder,
    unpacking,
    openUnpack,
    closeUnpack,
    rightPanel,
    setRightPanel,
    closePanel,
    card,
    setCard,
    searchOpen,
    openSearch,
    closeSearch,
    dismissWins,
    toggleSearch,
    dismissSearch,
    resetSurfaces
  } = useDesktopSurfaces(activeWallet)
  const { toast, showToast } = useDesktopToast()
  const { flashIds, flash } = useDesktopFlash()
  const { pulseId, pulse, clearPulse } = useDesktopPulse()
  const { consumeAssets, applySend, applyHandoff, applyMove } = useDesktopSettlement({ setAssets, setPositions, setFolders, onSettle, flash })
  const { selectedIds, setSelectedIds, marquee, onDeskPointerDown } = useDesktopMarquee({
    rootRef,
    positions,
    items: deskItems,
    folders: deskFolders,
    toScreen
  })
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

  // events
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
    pulse(id)
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
        kind: c.kind === "nft" ? "nft" : assetKindFor(c.symbol),
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
      flash(fresh.map((a) => a.id))
    }
  }

  // events
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

  // events
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

  // events
  // `clampPos` and friends run on the drag's hot path and read `detailCardIds` directly, so every
  // change to the set has to write the module mirror and the state together, here.
  const applyCardIds = useCallback((next: ReadonlySet<string>) => {
    setDetailCards(next)
    setCardIds(next)
  }, [])

  /** Swap a holding between its icon and its detail card. The object keeps its centre — the card grows
   *  out around where the icon stood rather than jumping — and then steps aside if that much wider
   *  footprint has landed on a neighbour. */
  const setDetailCard = (id: string, on: boolean) => {
    cue(on ? "bloom" : "error")
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

  /** Double-click swaps a holding between its icon and its detail card. Where no card can exist — a
   *  contact, or a split pane with no room for one — it opens the Inspector instead, so the gesture is
   *  never dead. */
  const onObjectDoubleClick = (obj: DesktopObj) => {
    if (obj.class !== "asset" || isSplit) return openInspector(obj.id)
    setDetailCard(obj.id, !cardIds.has(obj.id))
  }

  // events
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
    flash([asset.id, cloneId])
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

  /** Give up an object's desk slot — it has been spent, deleted or revoked. */
  const forgetPosition = (id: string) =>
    setPositions((pos) => {
      if (!pos) return pos
      const { [id]: gone, ...rest } = pos
      void gone
      return rest
    })

  // events
  const renameContact = (id: string, name: string) => {
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, label: name } : c)))
    setRenamingId(null)
  }
  const saveContact = (id: string, patch: Pick<PersonObj, "label" | "handle" | "address">) =>
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const deleteContact = (id: string) => {
    setContacts((list) => list.filter((c) => c.id !== id))
    forgetPosition(id)
    // an edit window for a wallet that no longer exists would save into nothing — take it down with it
    dismissWins((w) => w.kind === "contact" && w.contact.id === id)
  }

  // events
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

  // events
  const cleanupKeyRef = useRef<TidyKey | null>(null)
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
  /** The order a tidy lays a desk out in. Only "Name" says anything about wallets; the other keys are
   *  asset-shaped, so the contacts keep the order they already had. */
  const sortedFor = (key: TidyKey) => {
    const byName = (a: DesktopObj, b: DesktopObj) => a.label.localeCompare(b.label)
    return {
      assets: [...assets].sort(key === "name" ? byName : key === "value" ? (a, b) => b.usd - a.usd : (a, b) => a.kind.localeCompare(b.kind) || b.usd - a.usd),
      contacts: key === "name" ? [...contacts].sort(byName) : contacts
    }
  }
  const cleanUpBy = (key: TidyKey) => {
    cleanupKeyRef.current = key
    const { assets: a, contacts: c } = sortedFor(key)
    cleanUp(a, c)
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

  // events
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

  /** Packs and folders move through their own little drag rather than the desk's: nothing 3D flies (both
   *  are drawn flat in the DOM) and neither sees a drop zone, which is the whole one-level-deep rule. The
   *  wrapper is moved in viewport coordinates and the result stored back pane-relative. A press that never
   *  travelled is a click, so `onEnd` — which only fires for a real drag — is where the move lands.
   *  `onCross` is what to say when the release landed on the other wallet's half. */
  const movedRef = useRef(false)
  const startTileDrag = (id: string, wallet: Wallet, onCross?: (to: Wallet) => void) => (e: React.PointerEvent) => {
    if (e.button !== 0 || !positions) return
    const local = positions[id]
    if (!local) return
    const origin = toScreen(wallet, local)
    movedRef.current = false

    dragLoop(e, {
      threshold: 6,
      onStart: () => {
        movedRef.current = true
      },
      onMove: (dx, dy) => {
        const el = iconNodes.current.get(id)
        if (el) {
          el.style.left = `${origin.x + dx}px`
          el.style.top = `${origin.y + dy}px`
        }
      },
      onEnd: (dx, dy, ev) => {
        const landed = walletAt(ev.clientX)
        if (landed !== wallet) onCross?.(landed)
        const pane = panes[wallet]
        const p = clampPos(origin.x + dx - pane.left, origin.y + dy - pane.top, id, wallet)
        setPositions((pos) => (pos ? { ...pos, [id]: nearestFreeSpot(p, pos, id, 0, wallet) } : pos))
      }
    })
  }

  const startPackDrag = (pack: PackObj) => startTileDrag(pack.id, walletOf(pack))

  const startFolderDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    // part of a selection: the whole handful goes, folders included (they just can't be filed)
    if (selectedIds.has(id) && selectedIds.size > 1) {
      movedRef.current = true // the click that follows must not open the window
      return startCarry([...selectedIds], { settle: "formation" })(e)
    }
    if (selectedIds.size) setSelectedIds(new Set())
    const folder = folders.find((f) => f.id === id)
    // a folder is desk furniture, not a holding — there's nothing to settle, and its contents may not all
    // be welcome on the far desk (MetaMask takes no Solana). It stays put and says what to do.
    const onCross = (to: Wallet) => {
      cue("error")
      showToast("alert", `"${folder?.label ?? "That folder"}" can't move to ${walletLabel(to)} as one — open it and drag the assets across individually.`)
    }
    startTileDrag(id, folder?.wallet ?? activeWallet, onCross)(e)
  }

  const onFolderOpen = (id: string) => () => {
    // that gesture was a move, not an open
    if (movedRef.current) return
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

  // events
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
  const selectInspect = useCallback((id: string) => setRightPanel({ kind: "inspect", id }), [setRightPanel])
  const openRadar = () => {
    cue("bloom")
    setRightPanel({ kind: "radar" })
  }

  const removeAssetObject = (id: string) => {
    setAssets((list) => list.filter((a) => a.id !== id))
    forgetPosition(id)
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

  // events
  const markRetired = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, retired: true, compromised: false } : c)))
  const markCompromised = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, compromised: true, retired: false } : c)))
  const clearFlags = (id: string) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, retired: false, compromised: false } : c)))

  // events
  const resetDemo = () => {
    const startAssets = [...ASSETS, ...DUST_ASSETS, ...DUST_NFTS, ...EOA_ASSETS]
    const startPeople = [...PEOPLE, ...EOA_PEOPLE]
    const filed = new Set(INITIAL_FOLDERS.flatMap((f) => f.contents))
    setAssets(startAssets)
    setContacts(startPeople)
    setFolders(INITIAL_FOLDERS)
    setPacks([])
    setApprovals(APPROVAL_RADAR)
    resetSurfaces()
    setFolderWins([])
    clearPulse()
    setSelectedIds(new Set())
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

  // events
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

  // events
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

  // events
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
          dismissSearch()
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
    const tidy = (key: TidyKey) => {
      cleanupKeyRef.current = key
      const { assets: a, contacts: c } = sortedFor(key)
      cleanUpWallet(wallet, a, c)
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

  // effects
  useEffect(() => {
    if (!rootRef.current) return
    return registerCoinViewport(rootRef.current)
  }, [])

  // effects
  useEffect(() => installPressCues(), [])

  // effects
  // a layout effect, so the mirrors land before the browser paints and long before any pointer handler
  // could consult them. Declared ahead of everything that clamps so the ordering is never in question.
  useLayoutEffect(() => {
    setObjectWallets([
      ...assets.map((a): [string, Wallet] => [a.id, walletOf(a)]),
      ...contacts.map((c): [string, Wallet] => [c.id, walletOf(c)]),
      ...folders.map((f): [string, Wallet] => [f.id, f.wallet]),
      ...packs.map((p): [string, Wallet] => [p.id, walletOf(p)])
    ])
    setPanes(panes)
  }, [assets, contacts, folders, packs, panes])

  // effects
  useEffect(() => {
    if (!isSplit) return
    chromeKeepout.w = SPLIT_KEEPOUT.w
    chromeKeepout.h = SPLIT_KEEPOUT.h
    setKeepout({ ...SPLIT_KEEPOUT })
  }, [isSplit])

  // effects
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

  // effects
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

  // effects
  // clamped live (cheap, and it reads as the icons being pushed along by the divider); the collision
  // pass waits for the drag to end — see `onRatioCommit`.
  useEffect(() => {
    if (!isSplit) return
    settleIntoPanes(false)
  }, [splitRatio, isSplit, settleIntoPanes])

  // effects
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

  // effects
  // skips the first run — the seeding effect above owns the initial layout. Depends only on the box,
  // not on positions, so the relayout it triggers doesn't feed back into it.
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

  // effects
  useEffect(() => {
    if (!cardIds.size) return
    const live = new Set([...cardIds].filter((id) => !folderedIds.has(id) && assets.some((a) => a.id === id)))
    if (live.size !== cardIds.size) applyCardIds(live)
    // folderedIds is rebuilt every render from `folders`, which is the dependency that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIds, folders, assets, applyCardIds])

  // effects
  // the listener reads through a ref so it always sees the current assets and contacts without
  // re-registering on every change
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

  // effects
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        toggleSearch()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggleSearch])

  // effects
  // only the TOPMOST overlay closes, so a modal stacked over the Inspector closes on its own without
  // taking the Inspector down with it: the checks run highest-z first and the first open layer consumes
  // the key. The right-click menus own their own Escape but are still guarded here so it can't fall
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

  // effects
  // a re-render mid-drag resets the wrapper to the stale state position, so it is re-pinned after every
  // render, before paint. And once nothing is in hand, every wrapper is written back to its stored spot:
  // React skips re-writing a style prop it considers unchanged, so a drop that resolves to the icon's
  // existing position would otherwise leave the wrapper wherever the drag left it.
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
              <Placed key={a.id} id={a.id} at={p} nodes={iconNodes.current} carried={dragged?.id === a.id || carriedIds?.has(a.id)}>
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
                    onDoubleClick={() => onObjectDoubleClick(a)}
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
                    onDoubleClick={() => onObjectDoubleClick(a)}
                    onContextMenu={onIconMenu(a)}
                  />
                )}
              </Placed>
            )
          })}

        {positions &&
          contacts.map((c) => {
            const local = positions[c.id]
            if (!local || folderedIds.has(c.id) || !onScreen.has(walletOf(c))) return null
            const p = toScreen(walletOf(c), local)
            return (
              <Placed key={c.id} id={c.id} at={p} nodes={iconNodes.current} carried={dragged?.id === c.id || carriedIds?.has(c.id)}>
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
                  onDoubleClick={() => onObjectDoubleClick(c)}
                  onContextMenu={onIconMenu(c)}
                />
              </Placed>
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
              <Placed key={f.id} id={f.id} at={p} nodes={iconNodes.current} carried={carriedIds?.has(f.id)}>
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
              </Placed>
            )
          })}

        {/* the packs — DOM tiles like folders. Click to unpack, drag to move; a fresh one pulses. */}
        {positions &&
          deskPacks.map((pack) => {
            const local = positions[pack.id]
            if (!local) return null
            const p = toScreen(walletOf(pack), local)
            return (
              <Placed key={pack.id} id={pack.id} at={p} nodes={iconNodes.current}>
                <DesktopPack
                  pack={pack}
                  pulse={pulseId === pack.id}
                  onPointerDown={startPackDrag(pack)}
                  onDoubleClick={() => openUnpack(pack)}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </Placed>
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
              onMove={(amount, mergeIntoId) => applyMove(w.asset, w.to, amount, mergeIntoId, () => `mv-${assetIdc.current++}`)}
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
