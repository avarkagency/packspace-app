"use client"

import { type Dispatch, type SetStateAction, useCallback } from "react"

import { ICON_W, type Pos, nearestFreeSpot } from "@/const/desktop-layout"
import { panesMirror } from "@/stores/desk"
import type { AssetObj, FolderSpec, PersonObj, Receipt } from "@/types/objects"

import type { GiveSlot, HandoffReceive } from "@/components/desktop/window/WindowHandoff"
import type { SendDeal } from "@/components/desktop/window/WindowSend"

import { assetKindFor } from "@/lib/asset-ops"
import { isProjectG, routeLine } from "@/lib/chain"
import { makeReceipt } from "@/lib/receipt"
import { cue } from "@/lib/sound"
import { round4, units } from "@/lib/utils"
import { type Wallet, walletLabel, walletOf } from "@/lib/wallets"

type Args = {
  setAssets: Dispatch<SetStateAction<AssetObj[]>>
  setPositions: Dispatch<SetStateAction<Record<string, Pos> | null>>
  setFolders: Dispatch<SetStateAction<FolderSpec[]>>
  onSettle: (receipt: Receipt) => void
  flash: (ids: Iterable<string>) => void
}

export function useDesktopSettlement({ setAssets, setPositions, setFolders, onSettle, flash }: Args) {
  const consumeAssets = useCallback(
    (deals: SendDeal[]) => {
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
    },
    [setAssets, setFolders, setPositions]
  )

  // events
  const applySend = useCallback(
    (deals: SendDeal[], to: PersonObj) => {
      cue("sparkle") // a settled transaction
      consumeAssets(deals)
      const give = deals.map((d) => (d.asset.kind === "nft" ? d.asset.label : `${units(d.amount)} ${d.asset.symbol}`)).join(" + ")
      const lead = deals[0].asset
      onSettle(
        makeReceipt({
          action: "Send",
          give,
          counterparty: to.label,
          chain: lead.chain ?? "Base",
          seed: `send-${to.id}-${give}`,
          confirmation: "One-way transfer",
          route: routeLine(lead, to)
        })
      )
    },
    [consumeAssets, onSettle]
  )

  // events
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
        kind: assetKindFor(r.symbol),
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
        flash(received.map((a) => a.id))
      }

      const giveText = give.map((g) => (g.asset.kind === "nft" ? g.asset.label : `${units(g.amount)} ${g.asset.symbol}`)).join(" + ") || "Nothing"
      const receiveText = receive.map((r) => `${units(r.amount)} ${r.symbol}`).join(" + ")
      const chain = give[0]?.asset.chain ?? "Base"
      onSettle(
        makeReceipt({
          action: "Trade",
          give: giveText,
          receive: receiveText || undefined,
          counterparty: to.label,
          chain,
          seed: `handoff-${to.id}-${giveText}-${receiveText}`,
          confirmation: "Both parties",
          route: isProjectG(to) ? "Atomic · multichain (Project G)" : `Atomic on ${chain}`
        })
      )
    },
    [consumeAssets, flash, onSettle, setAssets, setPositions]
  )

  /** Settle a move: the holding changes wallet and takes a fresh slot on the far desk. A part-move of a
   *  fungible splits the balance instead, leaving the remainder behind; pooling folds it into the holding
   *  already over there rather than landing a second pile of the same token. */
  const applyMove = useCallback(
    (asset: AssetObj, to: Wallet, amount: number, mergeIntoId: string | null, nextId: () => string) => {
      cue("sparkle") // a settled transaction
      const from = walletOf(asset)
      const pane = panesMirror[to]
      const whole = asset.kind === "nft" || amount >= asset.balance
      const landedId = mergeIntoId ?? (whole ? asset.id : nextId())
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

      onSettle(
        makeReceipt({
          action: "Move",
          give: asset.kind === "nft" ? asset.label : `${units(amount)} ${asset.symbol}`,
          counterparty: walletLabel(to),
          chain: asset.chain ?? "Base",
          seed: `move-${asset.id}-${to}-${amount}`,
          confirmation: "Internal · same owner",
          route: mergeIntoId ? `${walletLabel(from)} → ${walletLabel(to)} · pooled` : `${walletLabel(from)} → ${walletLabel(to)}`
        })
      )
    },
    [onSettle, setAssets, setFolders, setPositions]
  )

  return { consumeAssets, applySend, applyHandoff, applyMove }
}
