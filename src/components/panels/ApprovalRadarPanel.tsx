"use client"

import { Ban, ShieldCheck, ShieldQuestion, X } from "lucide-react"

import type { Approval, RiskLevel } from "@/lib/types"

// Approval Radar — a right-docked panel listing every standing token approval as a card: who can spend,
// which token, how much (Unlimited flagged red), and a risk left-accent bar. Revoke removes the approval
// (and the linked scam token). Read-only safety surface; the objects carry the colour, the chrome stays
// quiet.

const RC: Record<RiskLevel, string> = { ok: "#8ee6a8", watch: "#f7c86a", danger: "#ff8a6a" }
const RL: Record<RiskLevel, string> = { ok: "Looks safe", watch: "Review", danger: "High risk" }

type Props = {
  approvals: Approval[]
  onRevoke: (id: string) => void
  onClose: () => void
}

export function ApprovalRadarPanel({ approvals, onRevoke, onClose }: Props) {
  const attention = approvals.filter((a) => a.risk !== "ok").length
  const summaryColor = attention ? "#f7c86a" : "#8ee6a8"

  return (
    <aside className="glass panel-slide fixed inset-y-0 right-0 z-[110] flex w-352 flex-col border-l border-white/10">
      <header className="flex items-center gap-8 border-b border-white/10 px-16 py-14">
        <ShieldCheck className="size-20 text-[#ff9d7a]" />
        <h2 className="text-14 leading-120 font-bold tracking-tight text-white">Approval Radar</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto grid size-30 place-items-center rounded-8 text-white/80 trans-base hover:bg-white/10">
          <X className="size-16" />
        </button>
      </header>

      {approvals.length > 0 && (
        <div className="flex items-center gap-8 border-b border-white/10 px-16 py-12" style={{ color: summaryColor }}>
          {attention ? <ShieldQuestion className="size-16" /> : <ShieldCheck className="size-16" />}
          <p className="text-12 leading-120 font-medium">
            {approvals.length} standing approval{approvals.length === 1 ? "" : "s"}
            {attention ? ` · ${attention} need${attention === 1 ? "s" : ""} attention` : " · all look safe"}
          </p>
        </div>
      )}

      <div className="no-scrollbar flex flex-1 flex-col gap-12 overflow-auto p-16">
        {approvals.length === 0 ? (
          <div className="mt-40 flex flex-col items-center gap-8 text-center">
            <ShieldCheck className="size-40 text-[#8ee6a8]" />
            <p className="text-13 leading-120 font-medium text-white">No standing approvals</p>
            <p className="text-11 leading-140 text-white/50">Nothing can move your tokens without you signing for it.</p>
          </div>
        ) : (
          approvals.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-10 rounded-14 border border-white/10 bg-white/5 p-14"
              style={{ borderLeft: `3px solid ${RC[a.risk]}` }}>
              <div className="flex items-center justify-between gap-8">
                <span className="truncate text-14 leading-120 font-bold text-white">{a.spender}</span>
                <span
                  className="flex shrink-0 items-center gap-3 rounded-full px-8 py-2 text-10 leading-120 font-bold"
                  style={a.verified ? { color: "#8ee6a8", background: "rgba(52,211,153,0.14)" } : { color: "#ff8a6a", background: "rgba(255,90,60,0.16)" }}>
                  {a.verified ? <ShieldCheck className="size-10" /> : <ShieldQuestion className="size-10" />}
                  {a.verified ? "Verified" : "Unverified"}
                </span>
              </div>

              <div className="flex items-center gap-10">
                <span
                  className="grid size-34 shrink-0 place-items-center rounded-full text-14 font-bold text-white"
                  style={{ background: a.color, filter: a.verified ? undefined : "saturate(0.35)" }}>
                  {a.glyph}
                </span>
                <div className="min-w-0">
                  <p className="text-11 leading-120 text-white/55">can spend your</p>
                  <p className="truncate text-12 leading-120 font-medium text-white">{a.assetName}</p>
                </div>
                <span
                  className="ml-auto shrink-0 rounded-7 px-8 py-2 text-11 leading-120 font-bold"
                  style={a.unlimited ? { color: "#ffc4b4", background: "rgba(255,90,60,0.16)" } : { color: "#cfe0ff", background: "rgba(255,255,255,0.1)" }}>
                  {a.unlimited ? "Unlimited" : `${a.allowance} ${a.symbol}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-8">
                <span className="text-11 leading-120 text-white/50">
                  {a.wallet} · {a.chain}
                </span>
                <span className="text-11 leading-120 font-bold" style={{ color: RC[a.risk] }}>
                  {RL[a.risk]}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRevoke(a.id)}
                className="flex items-center justify-center gap-6 rounded-9 border border-[#ff785a]/35 bg-[#ff5a3c]/13 py-6 trans-base hover:brightness-125">
                <Ban className="size-14 text-[#ff8a6a]" />
                <span className="text-12 leading-120 font-bold text-[#ffc4b4]">Revoke</span>
              </button>
            </div>
          ))
        )}
      </div>

      <footer className="border-t border-white/10 px-16 py-11 text-center text-10 leading-140 text-white/40">
        Revoking is a single on-chain transaction. Unlimited approvals to unverified contracts are the most common drain vector.
      </footer>
    </aside>
  )
}
