"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

import { Ban, Check, Copy, CreditCard, ExternalLink, type LucideIcon, Package, PackageOpen, Scissors, Sparkles, SquarePen, TriangleAlert, UserCheck, UserPlus, X } from "lucide-react"

import { clearCoinFocus, setCoinFocus } from "@/lib/coin-store"
import { type InspectAction, type Inspectable, inspectFacts, localExplain } from "@/lib/inspect"
import { assetMarket } from "@/lib/market"
import { cn, shortAddr, usd } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { BaseChangeTag } from "../base/BaseChangeTag"
import { BaseCountUp } from "../base/BaseCountUp"
import { BaseTypewriter } from "../base/BaseTypewriter"
import { RainbowBorderShader } from "../canvas/RainbowBorderShader"
import { ObjectMark } from "../canvas/ObjectMark"
import { chainImage } from "../canvas/objectVisual"
import { ContactAvatar } from "../shell/ContactAvatar"

// The AI Object Inspector as a full-screen takeover (design: Figma "Frame 5"). The whole viewport becomes
// the wallpaper again, the rainbow edge-glow radiates over it, and the object's read-out is laid out as a
// bento of glass cards — art, summary (spanning two), a price chart, the detail rows, a highlight/safety
// card and the contextual actions.
//
// The desk's own 3D coin flies into the art card and keeps spinning there: while this is open we hand the
// coin store the art card's box as the coin's target (setCoinFocus), the canvas lifts above the takeover,
// and the coin eases in from wherever it sat on the desk. The other cards fade up around it, and the AI
// summary "thinks" for two seconds before typing then scrambling in. The shader lives here so it only
// exists while the inspector is open.

/** Action kinds that resolve a warning — they ride inside the warning box rather than the actions box. */
const WARNING_ACTION_KINDS = new Set(["confirm", "whitelist", "verify", "revoke"])

const ACTION_ICON: Record<string, LucideIcon> = {
  split: Scissors,
  "add-to-pack": Package,
  revoke: Ban,
  verify: Sparkles,
  unpack: PackageOpen,
  whitelist: UserPlus,
  confirm: UserCheck,
  "view-card": CreditCard,
  edit: SquarePen
}

type Props = {
  obj: Inspectable
  /** Every inspectable object, in order — the Inspector steps through these (arrow keys now, a list UI
   *  later) and `onSelect` jumps to any of them. */
  objects: Inspectable[]
  /** Whether this object has a 3D coin (every asset and contact does — packs don't). */
  coinPresent: boolean
  /** Filed in a folder — its coin has no desk position, so it drops straight into the card rather than flying. */
  foldered: boolean
  onSelect: (id: string) => void
  /** The desktop wallpaper's CSS, so the takeover shows the same background. */
  wallpaper: string
  onAction: (kind: string) => void
  onClose: () => void
}

export function FullscreenInspector({ obj, objects, coinPresent, foldered, wallpaper, onAction, onSelect, onClose }: Props) {
  // refs — the invisible box in the art card the desk coin flies into
  const artRef = useRef<HTMLDivElement>(null)

  // state — the copy button flashes a tick (the summary manages its own reveal, keyed per object)
  const [copied, setCopied] = useState(false)

  // data
  const facts = inspectFacts(obj)
  const summary = localExplain(obj)
  const isAsset = obj.class === "asset"
  const market = useMemo(() => (obj.class === "asset" ? assetMarket(obj) : null), [obj])
  // a big ghost of the symbol behind the coin, sized to spill a touch past the card (clipped by it)
  const ghostSize = isAsset ? Math.min(210, Math.max(100, Math.round(310 / (0.6 * obj.symbol.length)))) : 0
  // the warning's own action (Confirm / Add to address book / Verify …) lives inside the warning box; the
  // rest (View Card, Edit, Split …) sit in the actions box below
  const warnActions = facts.safety ? facts.actions.filter((a) => WARNING_ACTION_KINDS.has(a.kind)) : []
  const mainActions = facts.actions.filter((a) => !warnActions.includes(a))

  // effects — pull the coin into the art card while open; on navigation it swaps in place (coin-store
  // handles the instant drop-in). A filed object drops straight in (no desk position to fly from). Packs
  // have no coin, so we just clear focus and the art card shows a mark.
  useEffect(() => {
    const el = artRef.current
    if (coinPresent && el) setCoinFocus(obj.id, el, foldered)
    else clearCoinFocus()
  }, [obj.id, coinPresent, foldered])
  useEffect(() => () => clearCoinFocus(), [])

  // effects — ← / → step to the previous / next inspectable object (wrapping), the same jump a list click
  // would make. Ignored while typing in a field (e.g. the Edit modal on top).
  useEffect(() => {
    if (objects.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const i = objects.findIndex((o) => o.id === obj.id)
      if (i < 0) return
      e.preventDefault()
      const next = objects[(i + (e.key === "ArrowRight" ? 1 : -1) + objects.length) % objects.length]
      onSelect(next.id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [objects, obj.id, onSelect])

  const copyAddress = () => {
    if (!obj.address) return
    navigator.clipboard?.writeText(obj.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const actionBtn = (act: InspectAction, primary: boolean) => (
    <BaseBtn
      key={act.kind}
      variant={primary && !act.danger ? undefined : "secondary"}
      icon={ACTION_ICON[act.kind] ?? Sparkles}
      className={cn("w-full", act.danger && "border-danger/40 bg-danger/10 text-[#ff8a6a] hover:bg-danger/20")}
      onClick={() => onAction(act.kind)}>
      {act.label}
    </BaseBtn>
  )

  const card = "glass rounded-20 p-32"

  return (
    <div className="fixed inset-0 z-[190]" role="dialog" aria-modal="true" aria-label="Object Inspector">
      {/* the takeover's own wallpaper (fades in as the coin flies in), then the rainbow edge-glow over it */}
      <div aria-hidden className="bg-fade absolute inset-0" style={{ background: wallpaper }} />
      <RainbowBorderShader className="absolute inset-0" />

      {/* close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass bento-in absolute top-16 right-16 z-20 grid size-40 place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-18" />
      </button>

      {/* the bento */}
      <div className="absolute inset-0 grid place-items-center p-24">
        <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(3, 300px)", gridTemplateRows: "repeat(2, 300px)" }}>
          {/* art — the desk coin flies into the invisible target; a ghost of the symbol overflows behind */}
          <div className={cn(card, "bento-in relative flex items-center justify-center overflow-hidden")} style={{ gridColumn: 1, gridRow: 1, animationDelay: "60ms" }}>
            {isAsset && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black tracking-tighter whitespace-nowrap text-white/8"
                style={{ fontSize: ghostSize, lineHeight: 1 }}>
                {obj.symbol}
              </span>
            )}
            {coinPresent ? (
              <div ref={artRef} aria-hidden className="size-200" />
            ) : (
              // only packs land here — no scene coin, so the glyph mark fades in
              <div key={obj.id} className="bg-fade relative">
                <ArtMark obj={obj} />
              </div>
            )}
          </div>

          {/* summary */}
          <div className={cn(card, "bento-in flex flex-col")} style={{ gridColumn: "2 / span 2", gridRow: 1, animationDelay: "200ms" }}>
            <div className="flex items-center gap-8">
              <Sparkles className="size-16 text-[#c4b6ff]" />
              <span className="text-12 leading-120 font-bold tracking-wide text-white/60">Summary</span>
            </div>
            {/* keyed per object, so a new object re-runs the two-second "generating" then types in */}
            <div className="mt-auto text-24 leading-140 font-light tracking-tight text-white">
              <Summary key={obj.id} text={summary} />
            </div>
          </div>

          {/* price chart — assets only; the chart bleeds to the card edges */}
          {isAsset && market && (
            <div className={cn(card, "bento-in flex flex-col")} style={{ gridColumn: 1, gridRow: 2, animationDelay: "280ms" }}>
              <p className="text-11 leading-120 text-white/60">{obj.symbol} / USD</p>
              <div className="mt-2 flex items-center gap-8">
                <BaseCountUp value={market.unit} format={(n) => usd(n, { cents: false })} delay={0.32} className="tnum text-24 font-light leading-120 tracking-tight text-white" />
                <BaseChangeTag pct={market.change} big countUp delay={0.32} />
              </div>
              {/* keyed per object so the left-to-right wipe replays on every navigation */}
              <div className="-mx-32 my-16 min-h-0 flex-1">
                <Sparkline key={obj.id} prices={market.prices} color={market.change < 0 ? "#ff6b5a" : "#22d3ee"} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-11 leading-120 text-white/50">24H High / Low</p>
                  <p className="tnum mt-2 text-13 leading-120 text-white">
                    <BaseCountUp value={market.high} format={(n) => usd(n, { cents: false })} delay={0.4} /> /{" "}
                    <BaseCountUp value={market.low} format={(n) => usd(n, { cents: false })} delay={0.4} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-11 leading-120 text-white/50">Vol.</p>
                  <p className="tnum mt-2 text-13 leading-120 text-white">
                    <BaseCountUp value={market.volB} format={(n) => `$${n.toFixed(1)}B`} delay={0.4} />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* detail rows — Balance / Network carry their marks; the contract address gets a copy button.
              Spans the chart's column too when there's no chart. */}
          <div className={cn(card, "bento-in flex flex-col")} style={{ gridColumn: isAsset ? "2" : "1 / span 2", gridRow: 2, animationDelay: "360ms" }}>
            <dl className="flex flex-col">
              {facts.rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-12 py-6">
                  <dt className="text-12 leading-120 text-white/50">{k}</dt>
                  <dd className="flex min-w-0 items-center gap-6 text-12 leading-120 font-medium text-white">
                    <RowIcon rowKey={k} obj={obj} />
                    <span className="tnum truncate">{v}</span>
                  </dd>
                </div>
              ))}
              {obj.address && (
                <div className="flex items-center justify-between gap-12 py-6">
                  <dt className="text-12 leading-120 text-white/50">Contract address</dt>
                  <dd className="flex min-w-0 items-center gap-6 text-12 leading-120 font-medium text-white">
                    <span className="tnum truncate">{shortAddr(obj.address)}</span>
                    <button type="button" onClick={copyAddress} aria-label="Copy address" className="grid size-16 shrink-0 place-items-center rounded-4 text-white/60 trans-base hover:bg-white/10 hover:text-white">
                      {copied ? <Check className="size-12 text-[#13e192]" /> : <Copy className="size-12" />}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
            {obj.address && (
              <div className="mt-auto flex justify-center pt-12">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-4 border-b border-white/20 pb-1 text-11 leading-120 text-white/70 trans-base hover:text-white">
                  View on Explorer <ExternalLink className="size-11" />
                </a>
              </div>
            )}
          </div>

          {/* right column: the actions, with a card above them — a warning (which stands out and holds its
              own fix-it action), or the holding/standing highlight. A safe contact drops the top card, and
              when every action is a warning action the actions box drops too — either way the box left fills
              the full height. */}
          <div className="flex flex-col gap-8" style={{ gridColumn: 3, gridRow: 2 }}>
            {facts.safety ? (
              <div
                className="bento-in flex min-h-0 flex-1 flex-col justify-center gap-12 rounded-20 border-2 p-32 backdrop-blur-xl"
                style={{ animationDelay: "440ms", borderColor: `${facts.safety.color}aa`, background: `${facts.safety.color}22` }}>
                <div className="flex items-start gap-8">
                  <TriangleAlert className="mt-px size-16 shrink-0" style={{ color: facts.safety.color }} />
                  <p className="text-13 leading-140 font-medium" style={{ color: facts.safety.color }}>{facts.safety.text}</p>
                </div>
                {warnActions.length > 0 && <div className="flex flex-col gap-8">{warnActions.map((a, i) => actionBtn(a, i === 0))}</div>}
              </div>
            ) : (
              obj.class !== "person" && (
                <div className={cn(card, "bento-in flex min-h-0 flex-1 flex-col justify-center")} style={{ animationDelay: "440ms" }}>
                  <Highlight obj={obj} market={market} facts={facts} />
                </div>
              )
            )}

            {mainActions.length > 0 && (
              <div className={cn(card, "bento-in flex min-h-0 flex-1 flex-col justify-center gap-8")} style={{ animationDelay: "520ms" }}>
                {mainActions.map((a, i) => actionBtn(a, i === 0))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The Figma's inline marks: the chain icon beside the Network value, the token mark beside Balance. */
function RowIcon({ rowKey, obj }: { rowKey: string; obj: Inspectable }) {
  if (obj.class !== "asset") return null
  if (rowKey === "Network" && obj.chain)
    return <Image src={chainImage(obj.chain)} alt="" width={16} height={16} unoptimized className="size-16 shrink-0 rounded-full object-cover" />
  if (rowKey === "Balance") return <ObjectMark obj={obj} size={16} />
  return null
}

/** The AI summary: a second of "generating" (skeleton), then the text types in. Mounted keyed by object
 *  id, so navigating to another object re-runs the whole thing — mimicking a fresh generation each time. */
function Summary({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1000)
    return () => clearTimeout(t)
  }, [])
  return revealed ? <BaseTypewriter text={text} /> : <SummaryLoading />
}

/** The AI summary's "thinking" state — pulsing skeleton lines until the text resolves in. */
function SummaryLoading() {
  return (
    <div aria-hidden className="flex flex-col gap-10">
      <span className="h-14 animate-pulse rounded-full bg-white/10" style={{ width: "100%" }} />
      <span className="h-14 animate-pulse rounded-full bg-white/10" style={{ width: "92%", animationDelay: "0.15s" }} />
      <span className="h-14 animate-pulse rounded-full bg-white/10" style={{ width: "74%", animationDelay: "0.3s" }} />
    </div>
  )
}

/** The object's mark, sized for the art card — used for packs (no scene coin) and as the assets/contacts
 *  fallback if their coin isn't in the scene. */
function ArtMark({ obj }: { obj: Inspectable }) {
  if (obj.class === "person") return <ContactAvatar contact={obj} size={168} className="relative" />
  if (obj.class === "pack")
    return (
      <span className="relative grid size-168 place-items-center rounded-24 text-56 font-extrabold text-white" style={{ background: obj.color }}>
        {obj.packGlyph ?? "★"}
      </span>
    )
  return (
    <span className="relative inline-flex rounded-full ring-2 ring-white">
      <ObjectMark obj={obj} size={168} />
    </span>
  )
}

/** The top-right card when there's no safety warning — the holding's value for an asset, the standing for
 *  a contact, the contents for a pack. Labels match the other cards' ("BNB / USD") style. */
function Highlight({ obj, market, facts }: { obj: Inspectable; market: ReturnType<typeof assetMarket> | null; facts: ReturnType<typeof inspectFacts> }) {
  if (obj.class === "asset")
    return (
      <>
        <p className="text-11 leading-120 text-white/60">Holding</p>
        <div className="mt-6 flex items-center gap-8">
          <BaseCountUp value={obj.usd} format={(n) => usd(n, { cents: false })} delay={0.5} className="tnum text-32 font-light leading-120 tracking-tight text-white" />
          {market && <BaseChangeTag pct={market.change} big countUp delay={0.5} />}
        </div>
      </>
    )
  return (
    <>
      <p className="text-11 leading-120 text-white/60">{obj.class === "pack" ? "Contents" : "Standing"}</p>
      <p className="mt-6 text-16 leading-140 font-medium text-white">{facts.typeLabel}</p>
    </>
  )
}

/** A cyan area sparkline. The line is inset vertically so its peaks and troughs never clip against the
 *  SVG's own top/bottom; the SVG wipes in (clip-path) while an overlay — a vertical guide, a marker dot and
 *  a value tooltip — reads out the price at the point under the cursor. The overlay sits outside the wipe
 *  so it never gets clipped. */
function Sparkline({ prices, color }: { prices: number[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 100
  const H = 40
  const PAD = 5 // vertical headroom, in viewBox units
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const norm = (p: number) => (hi > lo ? (p - lo) / (hi - lo) : 0.5)
  const step = W / (prices.length - 1)
  const py = (p: number) => H - PAD - norm(p) * (H - 2 * PAD)
  const line = prices.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${py(p).toFixed(2)}`).join(" ")
  const area = `${line} L ${W.toFixed(2)} ${H} L 0 ${H} Z`

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    setHover(Math.round(frac * (prices.length - 1)))
  }

  const hx = hover !== null ? (hover / (prices.length - 1)) * 100 : 0
  const hyPct = hover !== null ? (py(prices[hover]) / H) * 100 : 0

  return (
    <div className="relative size-full" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <div className="chart-reveal size-full" style={{ animationDelay: "340ms" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#sparkFill)" />
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      {hover !== null && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-white/25" style={{ left: `${hx}%` }} />
          <div aria-hidden className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${hx}%`, top: `${hyPct}%`, background: color }} />
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-8 border border-white/10 bg-black/70 px-6 py-3 text-10 leading-120 whitespace-nowrap text-white backdrop-blur-md"
            style={{ left: `${Math.max(12, Math.min(88, hx))}%`, top: `${hyPct}%`, marginTop: -10 }}>
            {usd(prices[hover], { cents: false })}
          </div>
        </>
      )}
    </div>
  )
}
