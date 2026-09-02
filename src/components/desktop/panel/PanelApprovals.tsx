"use client"

import Image from "next/image"

import type { Approval, RiskLevel } from "@/types/objects"
import { Ban, ShieldCheck, ShieldQuestion, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { chainImage } from "@/components/desktop/object/ObjectVisual"

import { artImage } from "@/lib/object-art"

const RL: Record<RiskLevel, string> = { ok: "Looks safe", watch: "Review", danger: "High risk" }

const FALLBACK = "/images/contacts/default.jpg"

type Props = {
  approvals: Approval[]
  onRevoke: (id: string) => void
  onClose: () => void
}

export function PanelApprovals({ approvals, onRevoke, onClose }: Props) {
  const attention = approvals.filter((a) => a.risk !== "ok").length

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

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 760, maxWidth: "100%" }}>
        <div className="p-24">
          <div className="flex items-center gap-10">
            <ShieldCheck className="size-20 text-[#ff9d7a]" />
            <h2 className="text-18 leading-120 tracking-tight text-white">Approval Radar</h2>
            {approvals.length > 0 && (
              <span className="ml-auto text-12 leading-120 font-medium" style={{ color: attention ? "#f7c86a" : "#8ee6a8" }}>
                {approvals.length} standing approval{approvals.length === 1 ? "" : "s"}
                {attention ? ` · ${attention} need${attention === 1 ? "s" : ""} attention` : " · all look safe"}
              </span>
            )}
          </div>

          <div className="-mx-24 mt-20 h-px bg-white/20" aria-hidden />

          {approvals.length === 0 ? (
            <div className="flex flex-col items-center gap-8 py-40 text-center">
              <ShieldCheck className="size-40 text-[#8ee6a8]" />
              <p className="text-13 leading-120 font-medium text-white">No standing approvals</p>
              <p className="text-11 leading-140 text-white/50">Nothing can move your tokens without you signing for it.</p>
            </div>
          ) : (
            <ul className="no-scrollbar mt-8 flex max-h-[58vh] flex-col divide-y divide-white/10 overflow-auto">
              {approvals.map((a) => (
                <li key={a.id} className="grid items-center gap-14 py-12" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.4fr) 96px auto" }}>
                  {/* who can spend — the shield's tooltip carries the risk read-out */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-6">
                      <span className="truncate text-13 leading-120 font-bold text-white">{a.spender}</span>
                      <span title={RL[a.risk]} className="flex shrink-0 cursor-help">
                        {a.verified ? <ShieldCheck className="size-12 text-[#8ee6a8]" /> : <ShieldQuestion className="size-12 text-[#ff8a6a]" />}
                      </span>
                    </div>
                    <span className="mt-2 flex items-center gap-4 text-11 leading-120 text-white/50">
                      <Image src={chainImage(a.chain)} alt="" width={12} height={12} unoptimized className="size-12 shrink-0 rounded-full object-cover" />
                      {a.chain}
                    </span>
                  </div>

                  {/* the token it can spend — its own mark, default face as the fallback */}
                  <div className="flex min-w-0 items-center gap-8">
                    <Image
                      src={artImage(a.symbol) ?? FALLBACK}
                      alt=""
                      width={30}
                      height={30}
                      unoptimized
                      draggable={false}
                      className="size-30 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-10 leading-120 text-white/50">can spend your</p>
                      <p className="truncate text-12 leading-120 font-medium text-white">{a.assetName}</p>
                    </div>
                  </div>

                  {/* allowance — fixed-width column so the flexible columns line up across every row */}
                  <div className="flex justify-end">
                    <span
                      className="tnum rounded-7 px-8 py-2 text-11 leading-120 font-bold"
                      style={
                        a.unlimited ? { color: "#ffc4b4", background: "rgba(255,90,60,0.16)" } : { color: "#cfe0ff", background: "rgba(255,255,255,0.1)" }
                      }>
                      {a.unlimited ? "Unlimited" : `${a.allowance} ${a.symbol}`}
                    </span>
                  </div>

                  <BaseBtn variant="secondary" size="sm" icon={Ban} onClick={() => onRevoke(a.id)}>
                    Revoke
                  </BaseBtn>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-20 text-center text-10 leading-140 text-white/40">
            Revoking is a single on-chain transaction. Unlimited approvals to unverified contracts are the most common drain vector.
          </p>
        </div>
      </div>
    </div>
  )
}
