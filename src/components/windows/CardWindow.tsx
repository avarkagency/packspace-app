"use client"

import { useMemo, useState } from "react"

import { GradientAvatar } from "@outpacelabs/avatars"
import { BadgeCheck, ChevronLeft, CreditCard, Hash, HelpCircle, Link2, MessageCircle, Send, ShieldCheck, X } from "lucide-react"

import { isProjectG } from "@/lib/chain"
import { ME } from "@/lib/data"
import type { Chain, PersonObj } from "@/lib/types"

import { BaseBtn } from "../base/BaseBtn"

// PackSpace Card — a shareable business card for a wallet: avatar, handle, address, chain chips, a
// verification chip, and a deterministic pseudo-QR. Share opens real Telegram / X / WhatsApp intents or
// copies the link. "Import a card" turns a pasted link / @handle / 0x address into an unconfirmed
// contact. Cards live off the workspace; importing is how contacts are born.

/** A deterministic pseudo-QR: a 13×13 grid with three corner finder blocks, the rest seeded from the
 *  card's address + name so the same card always draws the same code. */
function qrCells(seed: string): boolean[] {
  const N = 13
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const rnd = () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    return h / 0xffffffff
  }
  const finder = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3)
  const cells: boolean[] = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push(finder(r, c) ? (r === 1 && c === 1) || (r === 1 && c === N - 2) || (r === N - 2 && c === 1) || (r % 2 === 0 && c % 2 === 0) : rnd() > 0.52)
  return cells
}

const VCHIP = {
  Verified: { color: "#7fd3ff", bg: "rgba(127,211,255,0.16)", Icon: ShieldCheck },
  Confirmed: { color: "#8ee6a8", bg: "rgba(52,211,153,0.16)", Icon: BadgeCheck },
  Unverified: { color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.1)", Icon: HelpCircle }
} as const

type Props = {
  /** The contact whose card this is; undefined = your own card. */
  contact?: PersonObj
  onImport: (text: string) => void
  onClose: () => void
}

export function CardWindow({ contact, onImport, onClose }: Props) {
  // state
  const [importing, setImporting] = useState(false)
  const [text, setText] = useState("")

  // data
  const mine = !contact
  const name = mine ? ME.name : contact.label
  const handle = mine ? ME.handle : contact.trust === "verified" ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.pack` : `@${name.toLowerCase().slice(0, 12)}.pack`
  const address = mine ? ME.address : (contact.address ?? "")
  const chains: Chain[] = mine ? ME.chains : isProjectG(contact) ? ["Base", "Ethereum", "Solana", "Bitcoin"] : [contact.chain ?? "Base"]
  const vKey: keyof typeof VCHIP = mine ? "Unverified" : contact.trust === "verified" ? "Verified" : contact.trust === "confirmed" || contact.trust === "mutual" ? "Confirmed" : "Unverified"
  const vchip = VCHIP[vKey]
  const cells = useMemo(() => qrCells(address + name), [address, name])

  // events — real share intents
  const share = (channel: "telegram" | "x" | "whatsapp" | "copy") => {
    const link = `https://packspace.xyz/c/${mine ? "you" : contact.id}`
    const label = mine ? "My PackSpace Card" : `${name}'s PackSpace Card`
    if (channel === "copy") return void navigator.clipboard?.writeText(link)
    const url =
      channel === "telegram"
        ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(label)}`
        : channel === "x"
          ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(label)}&url=${encodeURIComponent(link)}`
          : `https://wa.me/?text=${encodeURIComponent(`${label} ${link}`)}`
    window.open(url, "_blank", "noopener")
  }

  const doImport = () => {
    if (!text.trim()) return
    onImport(text)
    onClose()
  }

  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: 220 }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 392 }}>
        <div className="p-24">
          <div className="flex items-center gap-8">
            <CreditCard className="size-20 text-white" />
            <h2 className="text-14 leading-120 font-bold tracking-tight text-white">PackSpace Card</h2>
            <span className="ml-auto text-11 leading-120 text-white/50">{mine ? "Yours to share" : "Imported contact"}</span>
          </div>

          {importing ? (
            <div className="mt-24">
              <p className="text-12 leading-140 text-white/60">
                Paste a PackSpace card link, @handle, or wallet address someone shared with you. It becomes an unconfirmed contact you can then confirm.
              </p>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="packspace.xyz/c/…  ·  @name.pack  ·  0x…"
                className="glass mt-16 w-full rounded-md px-13 py-12 font-mono text-12 text-white outline-none placeholder:text-white/40"
              />
              <div className="mt-20 flex gap-8">
                <BaseBtn variant="secondary" icon={ChevronLeft} className="flex-1" onClick={() => setImporting(false)}>
                  Back
                </BaseBtn>
                <BaseBtn className="flex-1" disabled={!text.trim()} onClick={doImport}>
                  Import card
                </BaseBtn>
              </div>
            </div>
          ) : (
            <>
              {/* the card itself */}
              <div
                className="mt-24 rounded-md border border-[#96a0ff]/28 p-18"
                style={{ background: "linear-gradient(150deg, rgba(120,90,255,0.22), rgba(59,130,246,0.14))" }}>
                <div className="flex gap-14">
                  <div className="flex min-w-0 flex-1 flex-col gap-11">
                    <GradientAvatar seed={address || name} size={52} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-17 leading-120 font-extrabold text-white">{name}</p>
                      <p className="truncate font-mono text-12 leading-120 text-[#c7d2fe]">{handle}</p>
                    </div>
                    <span className="flex w-fit items-center gap-4 rounded-full px-9 py-3 text-10 leading-120 font-bold tracking-wide" style={{ color: vchip.color, background: vchip.bg }}>
                      <vchip.Icon className="size-11" /> {vKey}
                    </span>
                    <div>
                      <p className="text-9 leading-120 font-bold tracking-wide text-white/40 uppercase">Address</p>
                      <p className="truncate font-mono text-12 leading-120 text-white">{address}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {chains.map((c) => (
                        <span key={c} className="rounded-full bg-white/10 px-8 py-2 text-10 leading-120 font-medium text-[#dbe4ff]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* the pseudo-QR */}
                  <div className="grid size-104 shrink-0 gap-0 rounded-10 bg-white p-7" style={{ gridTemplateColumns: "repeat(13,1fr)", gridTemplateRows: "repeat(13,1fr)" }}>
                    {cells.map((on, i) => (
                      <span key={i} style={{ background: on ? "#0b0e17" : "#fff" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* share row */}
              <p className="mt-20 text-10 leading-120 font-bold tracking-wide text-white/40 uppercase">Share</p>
              <div className="mt-8 grid grid-cols-4 gap-8">
                <ShareBtn label="Telegram" color="#4aa3e8" Icon={Send} onClick={() => share("telegram")} />
                <ShareBtn label="X" color="#e7e9ea" Icon={Hash} onClick={() => share("x")} />
                <ShareBtn label="WhatsApp" color="#4bd865" Icon={MessageCircle} onClick={() => share("whatsapp")} />
                <ShareBtn label="Copy link" color="#c4b6ff" Icon={Link2} onClick={() => share("copy")} />
              </div>

              {mine && (
                <button
                  type="button"
                  onClick={() => setImporting(true)}
                  className="glass mt-20 w-full rounded-md px-11 py-8 text-12 leading-120 font-medium text-[#dbe4ff] trans-base hover:bg-white/10">
                  Import a card
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareBtn({ label, color, Icon, onClick }: { label: string; color: string; Icon: typeof Send; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-5 rounded-12 border border-white/10 bg-white/5 px-4 py-11 trans-base hover:bg-white/10">
      <Icon className="size-20" style={{ color }} />
      <span className="text-10 leading-120 text-white/75">{label}</span>
    </button>
  )
}
