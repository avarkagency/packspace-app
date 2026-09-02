"use client"

import { useCallback, useRef, useState } from "react"

import type { AssetObj, PackObj, PersonObj, Receipt } from "@/types/objects"

import { cue } from "@/lib/sound"
import { type Wallet, walletOf } from "@/lib/wallets"

// Everything the desk can have OPEN, in one place: the stack of centred modals, the panels and
// full-screen surfaces that live outside it, and the receipts they settle into.
//
// The point of collecting them is the sound. Every surface blooms as it opens and errors as it closes,
// and opens funnel through these so a drop, a menu pick and a dock press all sound alike — a rule that
// only holds if there is no second way to set the state. (The global press cue, installed on mount,
// covers every other button click.)

export type WinBody =
  | { kind: "transfer"; assets: AssetObj[]; to: PersonObj }
  | { kind: "split"; asset: AssetObj }
  | { kind: "combine"; a: AssetObj; b: AssetObj }
  | { kind: "contact"; contact: PersonObj }
  | { kind: "new-contact"; draft: PersonObj; at: { x: number; y: number }; wallet: Wallet }
  | { kind: "delete-contact"; contact: PersonObj }
  | { kind: "receipt"; receipt: Receipt }
  // only holdings reach this: an address copies across on release instead (see `copyContactTo`)
  | { kind: "move"; asset: AssetObj; from: Wallet; to: Wallet; existing: AssetObj | null }

/** `matchKey` is what makes a repeated gesture raise the window it already opened rather than stack a
 *  second copy of it — dropping the same asset on the same contact twice reads as "show me that again". */
export type WinDraft = WinBody & { matchKey: string }
export type WinSpec = WinDraft & { id: string }

/** The right-docked panel: the Inspector on an object, or the Approval Radar. One at a time. */
export type RightPanel = { kind: "inspect"; id: string } | { kind: "radar" }

export function useDesktopSurfaces(activeWallet: Wallet) {
  const idc = useRef(0)

  /** The centred modal stack — order is stacking order, last on top. */
  const [wins, setWins] = useState<WinSpec[]>([])
  /** Settled receipts, newest first — the Receipts list reads these. */
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptsOpen, setReceiptsOpen] = useState(false)
  /** The Pack Builder: whose desk the pack lands on, optionally seeded with a dropped asset. */
  const [packBuilder, setPackBuilder] = useState<{ seed?: AssetObj; wallet: Wallet } | null>(null)
  const [unpacking, setUnpacking] = useState<PackObj | null>(null)
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null)
  /** The PackSpace Card modal — your own (contact undefined) or a saved contact's. */
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

  /** Take down any window whose subject has gone — an edit window for a wallet that no longer exists
   *  would save into nothing. Silent: nobody closed it, it stopped being about anything. */
  const dismissWins = (match: (w: WinSpec) => boolean) => setWins((w) => w.filter((x) => !match(x)))

  /** ⌘K, and picking a result. Both silent by design: the shortcut has no press to answer, and a pick
   *  is followed immediately by whatever it opened, which sounds for itself. */
  const toggleSearch = useCallback(() => setSearchOpen((o) => !o), [])
  const dismissSearch = useCallback(() => setSearchOpen(false), [])

  /** Close everything, for the demo reset. Silent — this isn't anyone closing anything. */
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
