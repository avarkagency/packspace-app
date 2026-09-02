"use client"

import { useCallback, useRef, useState } from "react"

import type { AssetObj, PackObj, PersonObj, Receipt } from "@/types/objects"

import { cue } from "@/lib/sound"
import { type Wallet, walletOf } from "@/lib/wallets"

export type WinBody =
  | { kind: "transfer"; assets: AssetObj[]; to: PersonObj }
  | { kind: "split"; asset: AssetObj }
  | { kind: "combine"; a: AssetObj; b: AssetObj }
  | { kind: "contact"; contact: PersonObj }
  | { kind: "new-contact"; draft: PersonObj; at: { x: number; y: number }; wallet: Wallet }
  | { kind: "delete-contact"; contact: PersonObj }
  | { kind: "receipt"; receipt: Receipt }
  | { kind: "move"; asset: AssetObj; from: Wallet; to: Wallet; existing: AssetObj | null }

export type WinDraft = WinBody & { matchKey: string }
export type WinSpec = WinDraft & { id: string }
export type RightPanel = { kind: "inspect"; id: string } | { kind: "radar" }

/** Every surface blooms open and errors closed. Routing all of them through this pair is what keeps that
 *  true — there is deliberately no second way to set the state. */
const show = <T>(set: (v: T) => void, v: T) => {
  cue("bloom")
  set(v)
}
const hide = <T>(set: (v: T) => void, v: T) => {
  cue("error")
  set(v)
}

export function useDesktopSurfaces(activeWallet: Wallet) {
  const idc = useRef(0)

  const [wins, setWins] = useState<WinSpec[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptsOpen, setReceiptsOpen] = useState(false)
  const [packBuilder, setPackBuilder] = useState<{ seed?: AssetObj; wallet: Wallet } | null>(null)
  const [unpacking, setUnpacking] = useState<PackObj | null>(null)
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null)
  const [card, setCard] = useState<{ contact?: PersonObj } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const open = useCallback((spec: WinDraft) => {
    cue("bloom")
    setWins((w) => {
      const ex = w.find((x) => x.matchKey === spec.matchKey)
      if (ex) return [...w.filter((x) => x !== ex), ex]
      return [...w, { ...spec, id: `w${idc.current++}` } as WinSpec]
    })
  }, [])

  const close = (id: string) => {
    cue("error")
    setWins((w) => w.filter((x) => x.id !== id))
  }

  const openReceipts = () => show(setReceiptsOpen, true)
  const closeReceipts = () => hide(setReceiptsOpen, false)

  // a pack lands on the desk whose holdings built it — a dropped seed names it, else the active desk
  const openPackBuilder = (seed?: AssetObj, wallet?: Wallet) => show(setPackBuilder, { seed, wallet: wallet ?? (seed ? walletOf(seed) : activeWallet) })
  const closePackBuilder = () => hide(setPackBuilder, null)

  const openUnpack = (pack: PackObj) => show(setUnpacking, pack)
  const closeUnpack = () => hide(setUnpacking, null)

  const closePanel = () => hide(setRightPanel, null)

  const openSearch = () => show(setSearchOpen, true)
  const closeSearch = () => hide(setSearchOpen, false)

  /** For a window whose subject has gone. Silent: nobody closed it, it stopped being about anything. */
  const dismissWins = (match: (w: WinSpec) => boolean) => setWins((w) => w.filter((x) => !match(x)))

  /** Silent by design: the shortcut has no press to answer, and a pick is followed by whatever it opens. */
  const toggleSearch = useCallback(() => setSearchOpen((o) => !o), [])
  const dismissSearch = useCallback(() => setSearchOpen(false), [])

  /** For the demo reset. Silent — this isn't anyone closing anything. */
  const resetSurfaces = () => {
    setWins([])
    setReceipts([])
    setReceiptsOpen(false)
    setPackBuilder(null)
    setUnpacking(null)
    setRightPanel(null)
    setCard(null)
    setSearchOpen(false)
  }

  const onSettle = useCallback(
    (receipt: Receipt) => {
      setReceipts((r) => [receipt, ...r])
      open({ kind: "receipt", receipt, matchKey: receipt.id })
    },
    [open]
  )

  return {
    wins,
    open,
    close,
    dismissWins,
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
    toggleSearch,
    dismissSearch,
    resetSurfaces
  }
}
