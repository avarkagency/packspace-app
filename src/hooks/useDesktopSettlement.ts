"use client"

import { type Dispatch, type SetStateAction, useCallback } from "react"

import { ICON_W, type Pos, nearestFreeSpot } from "@/const/desktop-layout"
import { panesMirror } from "@/stores/desk"
import type { AssetObj, FolderSpec, PersonObj, Receipt } from "@/types/objects"

import type { GiveSlot, HandoffReceive } from "@/components/desktop/window/WindowHandoff"
import type { SendDeal } from "@/components/desktop/window/WindowSend"

import { isProjectG, routeLine } from "@/lib/chain"
import { cue } from "@/lib/sound"
import { fakeHash, round4, units } from "@/lib/utils"
import { walletOf } from "@/lib/wallets"

// What actually happens when a transfer settles. Send and Handoff differ only in what they file
// afterwards, so the spending half is shared and each writes its own receipt.
//
// Nothing here is chain-aware beyond the wording — no transaction is signed and no value moves. It is
// the balances, the desk and the receipt list being kept consistent with what the user was shown.

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
        flash(received.map((a) => a.id))
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
    [consumeAssets, flash, onSettle, setAssets, setPositions]
  )

  return { consumeAssets, applySend, applyHandoff }
}
