"use client"

import { useCallback, useRef, useState } from "react"

import dynamic from "next/dynamic"

import { AppWindow, Radar, ReceiptText } from "lucide-react"

import { assetDropId, canCombine, isSplittable } from "@/lib/asset-ops"
import { APPROVALS, APPS, ASSETS, BALANCE_DELTA, PACKS, PEOPLE } from "@/lib/data"
import { useDrag } from "@/lib/drag-store"
import type { AssetObj, PackObj, PersonObj, Receipt } from "@/lib/types"

import { AssetGrid } from "../shell/AssetGrid"
import { ContactsPanel } from "../shell/ContactsPanel"
import { DragGhost } from "../shell/DragGhost"
import { FilterBar, type FilterKey, type Filters, type SortKey } from "../shell/FilterBar"
import { NavPlaceholder } from "../shell/NavPlaceholder"
import { ObjectHoverInfo } from "../shell/ObjectHoverInfo"
import { Sidebar, type NavKey } from "../shell/Sidebar"
import { SPLIT_DROP_KEY, SplitDock } from "../shell/SplitDock"
import { useAssetDrag } from "../shell/useAssetDrag"
import { CombineWindow } from "../windows/CombineWindow"
import { HandoffWindow } from "../windows/HandoffWindow"
import { ReceiptWindow } from "../windows/ReceiptWindow"
import { SendWindow } from "../windows/SendWindow"
import { SplitWindow } from "../windows/SplitWindow"

// WebGL can't render on the server, and the coin faces are drawn to a 2D canvas at material-build time.
const ObjectScene = dynamic(() => import("../canvas/ObjectScene").then((m) => m.ObjectScene), { ssr: false })

/** Long enough to catch the eye, short enough not to become part of the furniture. */
const CLONE_PULSE_MS = 1800

type WinBody =
  | { kind: "send"; asset: AssetObj; to: PersonObj }
  | { kind: "handoff"; asset: AssetObj; to: PersonObj }
  | { kind: "split"; asset: AssetObj }
  | { kind: "combine"; a: AssetObj; b: AssetObj }
  | { kind: "receipt"; receipt: Receipt }

type WinDraft = WinBody & { matchKey: string }
type WinSpec = WinDraft & { id: string }

/** A value sort ranks on `sortUsd` where an object has one — split portions carry the value they came
 *  from, so they hold their parent's slot instead of dropping to wherever half of it ranks. Sort is
 *  stable, so portions sharing a parent's rank stay in the order they were inserted: original, then
 *  clone. */
const rank = (o: AssetObj | PackObj) => ("sortUsd" in o && o.sortUsd != null ? o.sortUsd : o.usd)

function compareBy(sort: SortKey) {
  return (a: AssetObj | PackObj, b: AssetObj | PackObj) => {
    if (sort === "value-asc") return rank(a) - rank(b)
    if (sort === "name") return a.label.localeCompare(b.label)
    if (sort === "chain") return (a.chain ?? "").localeCompare(b.chain ?? "") || rank(b) - rank(a)
    return rank(b) - rank(a)
  }
}

export function PackSpaceWorkspace() {
  // refs
  const idc = useRef(0)
  const assetIdc = useRef(0)
  const ghostRef = useRef<HTMLDivElement>(null)
  const cloneTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // state — assets are stateful because Split divides one object into two; everything else is fixture data
  const [assets, setAssets] = useState<AssetObj[]>(ASSETS)
  const [nav, setNav] = useState<NavKey>("assets")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<Filters>({ tokens: true, packs: true, nfts: true })
  const [sort, setSort] = useState<SortKey>("value-desc")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clonedId, setClonedId] = useState<string | null>(null)
  const [wins, setWins] = useState<WinSpec[]>([])

  // drag
  const { asset: draggedAsset } = useDrag()

  // data
  const qq = query.trim().toLowerCase()
  const matches = (o: AssetObj | PackObj) => !qq || o.label.toLowerCase().includes(qq) || ("symbol" in o && o.symbol.toLowerCase().includes(qq))

  const assetsVisible = assets.filter((a) => {
    const isNft = a.kind === "nft" || a.kind === "stack"
    return (isNft ? filters.nfts : filters.tokens) && matches(a)
  })
  const packsVisible = filters.packs ? PACKS.filter(matches) : []
  const gridItems: (AssetObj | PackObj)[] = [...assetsVisible, ...packsVisible].sort(compareBy(sort))
  const gridTotal = gridItems.reduce((t, o) => t + o.usd, 0)

  const selectedAsset = selectedId ? (assets.find((a) => a.id === selectedId) ?? null) : null
  // The rail and the split dock act on the selected asset OR whatever is mid-drag, so a picked-up coin
  // always has a live target.
  const displayAsset = selectedAsset ?? draggedAsset

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

  // events — dashboard
  const toggleFilter = (k: FilterKey) =>
    setFilters((f) => {
      const on = Number(f.tokens) + Number(f.packs) + Number(f.nfts)
      // from every group visible, a click means "show me only this" — hiding one is rarely what you
      // meant, and soloing takes one click instead of two
      if (on === 3) return { tokens: false, packs: false, nfts: false, [k]: true }
      // clicking off the last group left would empty the grid; read it as "done filtering" and restore
      // everything. Between the two, all-off is unreachable — there's no way to strand yourself.
      if (on === 1 && f[k]) return { tokens: true, packs: true, nfts: true }
      return { ...f, [k]: !f[k] }
    })
  /** Asking for a different sort drops every split's pinned rank. Holding a portion in its parent's slot
   *  is a courtesy for the moment it's divided — so the object you're working on doesn't leap away — not
   *  a claim about what it's worth. Re-sort and you want the truth. */
  const onSortChange = (k: SortKey) => {
    setSort(k)
    setAssets((list) => (list.some((a) => a.sortUsd != null) ? list.map((a) => (a.sortUsd == null ? a : { ...a, sortUsd: undefined })) : list))
  }

  // packs have nothing to activate: they don't drag, and there's no modal behind them any more. Their
  // detail lives in the hover readout, same as everything else.
  const onActivate = (obj: AssetObj | PackObj) => {
    if (obj.class === "asset") setSelectedId((cur) => (cur === obj.id ? null : obj.id))
  }

  // Neither of these selects the asset. Selection means "I'm working with this coin, show me its
  // actions" — a drop is that whole errand in one gesture, so leaving it selected afterwards strands the
  // zones and the dock on screen once the modal closes. The click path arrives here already selected, so
  // nothing changes for it: the modal opens over its zones and they're still there behind it.
  const startAction = (asset: AssetObj, action: "send" | "handoff", to: PersonObj) => {
    open({ kind: action, asset, to, matchKey: `${action}-${asset.id}-${to.id}` })
  }
  const startSplit = (asset: AssetObj) => {
    open({ kind: "split", asset, matchKey: `split-${asset.id}` })
  }
  const startCombine = (a: AssetObj, b: AssetObj) => {
    // order-independent key, so dropping A on B and B on A raise the same window rather than two
    open({ kind: "combine", a, b, matchKey: `combine-${[a.id, b.id].sort().join("-")}` })
  }

  /** Mark the object a split just produced. It sits beside an identical-looking twin, so without this
   *  there's nothing to say which one is new. Clears itself — it's an announcement, not a state. */
  const flashClone = (id: string) => {
    clearTimeout(cloneTimer.current)
    setClonedId(id)
    cloneTimer.current = setTimeout(() => setClonedId(null), CLONE_PULSE_MS)
  }

  /** Divide an object: the original survives — same id, same cell, lighter — and a clone lands beside it.
   *  Value is proportional; a split moves nothing, it only divides what's already held.
   *
   *  Both carry the pre-split value as their sort rank, so the pair holds the slot the whole object had.
   *  Without that, halving your largest holding under a value sort throws both halves down the grid, and
   *  the thing you were working on vanishes from under the cursor. */
  const splitAsset = (asset: AssetObj, portion: number) => {
    const cloneId = `${asset.id}-s${assetIdc.current++}`
    const rate = asset.usd / asset.balance
    const kept = asset.balance - portion
    const sortUsd = asset.sortUsd ?? asset.usd

    setAssets((list) => {
      const i = list.findIndex((a) => a.id === asset.id)
      if (i < 0) return list
      const original: AssetObj = { ...asset, balance: kept, usd: kept * rate, sortUsd }
      const clone: AssetObj = { ...asset, id: cloneId, balance: portion, usd: portion * rate, sortUsd }
      return [...list.slice(0, i), original, clone, ...list.slice(i + 1)]
    })

    flashClone(cloneId)
    setSelectedId(null)
  }

  /** Pour two portions back into one, landing where the earlier of the two sat. Value is additive — the
   *  holding is identical either side of a combine. */
  const combineAssets = (a: AssetObj, b: AssetObj) => {
    setAssets((list) => {
      const ia = list.findIndex((x) => x.id === a.id)
      const ib = list.findIndex((x) => x.id === b.id)
      if (ia < 0 || ib < 0) return list
      const merged: AssetObj = { ...a, id: `${a.id}-c${assetIdc.current++}`, balance: a.balance + b.balance, usd: a.usd + b.usd }
      // both removals sit at or after the earlier index, so it still addresses the same slot afterwards
      const rest = list.filter((x) => x.id !== a.id && x.id !== b.id)
      const at = Math.min(ia, ib)
      return [...rest.slice(0, at), merged, ...rest.slice(at)]
    })
    setSelectedId(null)
  }

  const onDrop = (asset: AssetObj, dropKey: string) => {
    if (dropKey === SPLIT_DROP_KEY) {
      if (isSplittable(asset)) startSplit(asset)
      return
    }
    // checked before the contact split below: an asset key is `asset:<id>`, which would otherwise parse
    // as a contact named "asset"
    const targetId = assetDropId(dropKey)
    if (targetId) {
      const target = assets.find((x) => x.id === targetId)
      if (target && canCombine(asset, target)) startCombine(asset, target)
      return
    }
    const [contactId, action] = dropKey.split(":")
    const to = PEOPLE.find((p) => p.id === contactId)
    if (to && (action === "send" || action === "handoff")) startAction(asset, action, to)
  }
  const { onPointerDown } = useAssetDrag(ghostRef, { onDrop, onClick: onActivate })

  const onNav = (k: NavKey) => {
    setNav(k)
    if (k !== "assets") setSelectedId(null)
  }
  const sendTo = (to: PersonObj) => displayAsset && startAction(displayAsset, "send", to)
  const handoffTo = (to: PersonObj) => displayAsset && startAction(displayAsset, "handoff", to)

  return (
    <div className="flex h-full">
      <Sidebar
        active={nav}
        onNav={onNav}
        counts={{ assets: assets.length + PACKS.length, contacts: PEOPLE.length, activity: undefined, dapps: APPS.length, approvals: APPROVALS.length }}
      />

      <main className="flex min-w-0 flex-1">
        {nav === "assets" ? (
          <>
            {/* relative: the split dock sits over the foot of the grid rather than in the layout, so
                revealing it can't resize the grid and shuffle every card mid-drag */}
            <section className="relative flex min-w-0 flex-1 flex-col">
              <FilterBar
                query={query}
                onQuery={setQuery}
                filters={filters}
                onToggle={toggleFilter}
                sort={sort}
                onSort={onSortChange}
                totalUsd={gridTotal}
                delta={BALANCE_DELTA}
                count={gridItems.length}
              />
              <AssetGrid items={gridItems} clonedId={clonedId} onPointerDown={onPointerDown} />
              <SplitDock asset={displayAsset} onSplit={() => displayAsset && startSplit(displayAsset)} />
            </section>
            <ContactsPanel asset={displayAsset} contacts={PEOPLE} onSend={sendTo} onHandoff={handoffTo} />
          </>
        ) : nav === "contacts" ? (
          <NavPlaceholder icon={ReceiptText} title="Contacts" blurb="Your contact objects live here — add, confirm, block, and manage the address lifecycle (retired / compromised). For this prototype, pick a contact from the panel after selecting an asset." />
        ) : nav === "activity" ? (
          <NavPlaceholder icon={ReceiptText} title="Activity" blurb="Every settled Send and Handoff produces a receipt / proof card. This history page isn't part of the prototype — receipts open inline when an action settles." />
        ) : nav === "dapps" ? (
          <NavPlaceholder icon={AppWindow} title="dApps" blurb="The Project G dApp launcher — each app renders as a contract-as-machine you can drag objects onto. Its own page is out of scope for this prototype." items={APPS.map((a) => a.label)} />
        ) : (
          <NavPlaceholder icon={Radar} title="Approvals" blurb="Approval Radar maps your standing contract permissions with a risk label and a revoke control. Its own page is out of scope for this prototype." items={APPROVALS.map((a) => `${a.label} · ${a.scope}`)} />
        )}
      </main>

      {/* the 3D objects — mounted regardless of nav, since one only draws where a card registered a
          slot, and unmounting the canvas would churn the WebGL context on every nav change */}
      <ObjectScene items={gridItems} />

      {/* modals */}
      {wins.map((w, i) => {
        const z = 200 + i
        if (w.kind === "send") return <SendWindow key={w.id} asset={w.asset} to={w.to} z={z} onClose={() => close(w.id)} onSettle={onSettle} onLog={noop} />
        if (w.kind === "handoff") return <HandoffWindow key={w.id} seed={w.asset} to={w.to} z={z} onClose={() => close(w.id)} onSettle={onSettle} onLog={noop} />
        if (w.kind === "split") return <SplitWindow key={w.id} asset={w.asset} z={z} onClose={() => close(w.id)} onSplit={(p) => splitAsset(w.asset, p)} />
        if (w.kind === "combine")
          return <CombineWindow key={w.id} a={w.a} b={w.b} z={z} onClose={() => close(w.id)} onCombine={() => combineAssets(w.a, w.b)} />
        return <ReceiptWindow key={w.id} receipt={w.receipt} z={z} onClose={() => close(w.id)} />
      })}

      <ObjectHoverInfo items={gridItems} />
      <DragGhost ghostRef={ghostRef} />
    </div>
  )
}
