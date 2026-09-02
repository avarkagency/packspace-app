import type { AssetObj, PackObj, PersonObj } from "@/types/objects"

import { isProjectG } from "./chain"
import { units, usd } from "./utils"

export type Inspectable = AssetObj | PersonObj | PackObj

const WALLET_LABEL = "Openfort wallet"

const COL: Record<string, string> = {
  asset: "#ffffff",
  nft: "#f3c6ec",
  contact: "#9fd0ff",
  pack: "#ffd7a3"
}
const AMBER = "#f7c86a"
const RED = "#ff8a6a"

/** The local fallback for when there's no model call. */
export function localExplain(obj: Inspectable): string {
  if (obj.class === "asset") {
    if (obj.kind === "nft")
      return `${obj.label} is a 1-of-1 collectible held in your ${WALLET_LABEL}. Drag it onto a contact to Send or Handoff it, or add it to a Pack.`
    if (obj.verified === false) {
      const appr = obj.approval ? " and it holds an unlimited approval to an unverified contract" : ""
      const revoke = obj.approval ? ", revoke the approval," : ""
      return `${obj.label} isn't on your verified token list${appr}. This is a common scam pattern — don't approve or interact with it${revoke} until you're sure it's real.`
    }
    return `${obj.label} is a fungible token you hold in your ${WALLET_LABEL}. Drag it onto a contact to Send or Handoff it, right-click to split off a smaller amount, or drop it on the Pack Builder to bundle it.`
  }
  if (obj.class === "pack")
    return `${obj.label} is a Pack — a bundle of assets wrapped into a single object you can move in one go. Click it to unpack and claim the contents, or drag it onto a contact to hand the whole bundle over at once.`
  // contact
  if (obj.whitelisted === false)
    return `${obj.label} is an address that isn't in your address book — you've never transacted with it. Anyone can send you tokens unprompted, so verify who owns it before sending anything. You can add it to your address book once you trust it.`
  return `${obj.label} is a saved address on ${obj.chain ?? "Base"}. Drag an object onto it to Send, or start a Handoff where both sides confirm before anything moves.`
}

export type InspectAction = { kind: string; label: string; danger?: boolean }
export type InspectFacts = {
  typeLabel: string
  typeColor: string
  rows: [string, string][]
  safety: { color: string; text: string } | null
  actions: InspectAction[]
}

export function inspectFacts(obj: Inspectable): InspectFacts {
  if (obj.class === "asset") return assetFacts(obj)
  if (obj.class === "pack") return packFacts(obj)
  return contactFacts(obj)
}

function assetFacts(a: AssetObj): InspectFacts {
  if (a.kind === "nft")
    return {
      typeLabel: "Collectible · NFT",
      typeColor: COL.nft,
      rows: [
        ["Token standard", "ERC-721"],
        ["Edition", "1 of 1"],
        ["Network", a.chain ?? "Base"],
        ["Held in", WALLET_LABEL]
      ],
      safety: null,
      actions: [{ kind: "add-to-pack", label: "Add to a Pack" }]
    }

  const unverified = a.verified === false
  // order follows the Inspector's Figma: standard, network, balance, value, verification, [approval], held in
  const rows: [string, string][] = [
    ["Token standard", "ERC-20"],
    ["Network", a.chain ?? "Base"],
    ["Balance", `${units(a.balance)} ${a.symbol}`],
    ["Value", unverified ? "Unknown" : usd(a.usd)],
    ["Verification", unverified ? "Unverified" : "Verified"]
  ]
  if (a.approval) rows.push(["Approval", `${a.approval.unlimited ? "Unlimited" : "Limited"} → ${a.approval.spender}`])
  rows.push(["Held in", WALLET_LABEL])

  if (unverified)
    return {
      typeLabel: "Unverified token",
      typeColor: AMBER,
      rows,
      safety: {
        color: RED,
        text: a.approval
          ? "This token isn't on your verified list and it holds an unlimited approval to an unverified contract — a classic scam setup. Don't interact with it. Revoke the approval, then hide it."
          : "This token isn't on your verified list. It may be spam or a scam airdrop — don't approve or interact with it until you've confirmed it's real."
      },
      actions: [...(a.approval ? [{ kind: "revoke", label: "Revoke approval", danger: true }] : []), { kind: "verify", label: "Add to verified list" }]
    }

  return {
    typeLabel: "Fungible token",
    typeColor: COL.asset,
    rows,
    safety: null,
    actions: [
      { kind: "split", label: "Split off an amount" },
      { kind: "add-to-pack", label: "Add to a Pack" }
    ]
  }
}

function packFacts(p: PackObj): InspectFacts {
  return {
    typeLabel: "Pack · bundle",
    typeColor: COL.pack,
    rows: [
      ["Token standard", p.standard ?? "ERC-721"],
      ["Kind", p.packType ?? "Product"],
      ["Contents", p.meta ?? p.contents],
      ["Lock", p.locked ? (p.lockKind ?? "Password") : "None"],
      ["Network", p.chain ?? "Base"],
      ["Held in", WALLET_LABEL]
    ],
    safety: null,
    actions: [{ kind: "unpack", label: "Open / unpack" }]
  }
}

function contactFacts(c: PersonObj): InspectFacts {
  if (c.whitelisted === false)
    return {
      typeLabel: "Unknown address",
      typeColor: AMBER,
      rows: [
        ["Address", c.address ? `${c.address.slice(0, 6)}…${c.address.slice(-4)}` : c.handle],
        ["Network", c.chain ?? "Base"],
        ["In address book", "No"],
        ["Trust", "Unknown"]
      ],
      safety: {
        color: RED,
        text: "This address isn't in your address book and you've never transacted with it. Anyone can send you tokens unprompted — don't assume it's someone you know. Verify who owns it before sending anything."
      },
      actions: [{ kind: "whitelist", label: "Add to address book" }]
    }

  const projectG = isProjectG(c)
  const typeLabel = projectG ? "Project G wallet" : "External address"
  const trust = c.trust === "verified" ? "Verified exchange" : c.trust === "unconfirmed" ? "Unconfirmed" : "Confirmed contact"
  const detail: [string, string][] = projectG
    ? [
        ["Wallet", "Project G · Openfort"],
        ["Chains", "Multichain — accepts any asset"]
      ]
    : [
        ["Type", "External wallet"],
        ["Chain", `${c.chain ?? "Base"} only`]
      ]
  // standing then trust lead the list, so the read-out needs no reassurance banner beside it
  const rows: [string, string][] = [
    ["Standing", typeLabel],
    ["Trust", trust],
    ...detail,
    ["Status", c.compromised ? "Compromised" : c.retired ? "Retired" : "Active"]
  ]

  // only the warnings keep a banner now; a verified / confirmed contact just reads its trust in the list
  const safety = c.compromised
    ? { color: RED, text: "This address is flagged COMPROMISED. PackSpace blocks sends to it. Only clear the flag if you are certain the key is safe again." }
    : c.retired
      ? { color: AMBER, text: "This address is marked Retired — you've stopped using it. You'll be warned before sending to it." }
      : c.trust === "unconfirmed"
        ? { color: AMBER, text: "This address is saved but not confirmed yet. Double-check it before sending anything." }
        : null

  const actions: InspectAction[] = [
    { kind: "view-card", label: "View PackSpace Card" },
    { kind: "edit", label: "Edit" }
  ]
  if (c.trust === "unconfirmed" && !c.compromised && !c.retired) actions.push({ kind: "confirm", label: "Confirm contact" })

  return { typeLabel, typeColor: COL.contact, rows, safety, actions }
}
