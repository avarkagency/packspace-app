"use client"

import { useMemo, useState } from "react"

import { GradientAvatar } from "@outpacelabs/avatars"
import { BadgeCheck, ChevronLeft, CreditCard, HelpCircle, Link2, ShieldCheck, X } from "lucide-react"

import { isProjectG } from "@/lib/chain"
import { ME } from "@/lib/data"
import type { Chain, PersonObj } from "@/lib/types"

import { BaseBtn } from "../base/BaseBtn"
import { ContactAvatar } from "../shell/ContactAvatar"

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
        <div className="p-28">
          <div className="flex items-center gap-12">
            <span
              className="grid size-40 shrink-0 place-items-center rounded-12"
              style={{ background: "rgba(150,160,255,0.16)", border: "1px solid rgba(150,160,255,0.35)", color: "#c7d2fe" }}>
              <CreditCard className="size-20" />
            </span>
            <div className="min-w-0">
              <h2 className="text-18 leading-120 tracking-tight text-white">PackSpace Card</h2>
              <p className="text-12 leading-120 text-white/60">{mine ? "Yours to share" : "Imported contact"}</p>
            </div>
          </div>

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

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
                    {contact ? <ContactAvatar id={contact.id} size={52} /> : <GradientAvatar seed={address || name} size={52} className="shrink-0" />}
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
                <ShareBtn label="Telegram" color="#29a9ea" Icon={TelegramLogo} onClick={() => share("telegram")} />
                <ShareBtn label="X" color="#e7e9ea" Icon={XLogo} onClick={() => share("x")} />
                <ShareBtn label="WhatsApp" color="#25d366" Icon={WhatsAppLogo} onClick={() => share("whatsapp")} />
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

type IconProps = { className?: string; style?: React.CSSProperties }

function ShareBtn({ label, color, Icon, onClick }: { label: string; color: string; Icon: React.ComponentType<IconProps>; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-12 border border-white/10 bg-white/5 py-12 trans-base hover:bg-white/10 active:scale-97">
      <Icon className="size-20" style={{ color }} />
    </button>
  )
}

/** Brand marks for the share row — Lucide ships no logos, so these are the official single-path glyphs
 *  (Simple Icons), filled via currentColor so the button's colour carries through. */
function TelegramLogo({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}
function XLogo({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  )
}
function WhatsAppLogo({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}
