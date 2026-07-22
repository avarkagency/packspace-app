"use client"

import { GradientAvatar } from "@outpacelabs/avatars"
import { Ban, type LucideIcon, Package, PackageOpen, Scissors, Sparkles, UserCheck, UserPlus, X } from "lucide-react"

import { type Inspectable, inspectFacts, localExplain } from "@/lib/inspect"
import { cn } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { ObjectMark } from "../canvas/ObjectMark"

// AI Object Inspector — a right-docked panel that explains the selected object in plain English and
// surfaces its facts, a safety note, and contextual actions. Local explanation only (no model call);
// the label reads "Summary". Actions bubble up as kinds the workspace maps to handlers.

const ACTION_ICON: Record<string, LucideIcon> = {
  split: Scissors,
  "add-to-pack": Package,
  revoke: Ban,
  verify: Sparkles,
  unpack: PackageOpen,
  whitelist: UserPlus,
  confirm: UserCheck
}

type Props = {
  obj: Inspectable
  onAction: (kind: string) => void
  onClose: () => void
}

export function InspectorPanel({ obj, onAction, onClose }: Props) {
  const facts = inspectFacts(obj)
  const summary = localExplain(obj)

  return (
    <aside className="glass panel-slide fixed inset-y-0 right-0 z-[110] flex w-400 flex-col border-l border-white/10">
      <header className="flex items-center gap-8 border-b border-white/10 px-16 py-14">
        <Sparkles className="size-20 text-[#c4b6ff]" />
        <h2 className="text-14 leading-120 font-bold tracking-tight text-white">Object Inspector</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto grid size-30 place-items-center rounded-8 text-white/80 trans-base hover:bg-white/10">
          <X className="size-16" />
        </button>
      </header>

      <div className="no-scrollbar flex flex-1 flex-col gap-16 overflow-auto p-16">
        {/* head */}
        <div className="flex items-center gap-12">
          <Head obj={obj} />
          <div className="min-w-0">
            <p className="truncate text-17 leading-120 font-extrabold text-white">{obj.label}</p>
            <span
              className="mt-4 inline-flex rounded-full border border-white/12 bg-white/8 px-10 py-3 text-10 leading-120 font-bold tracking-wide"
              style={{ color: facts.typeColor }}>
              {facts.typeLabel}
            </span>
          </div>
        </div>

        {/* the plain-English summary */}
        <div className="rounded-14 border border-[#9682ff]/22 bg-[#785aff]/10 p-14">
          <div className="mb-8 flex items-center gap-6 text-white">
            <Sparkles className="size-15" />
            <span className="text-10 leading-120 font-bold tracking-wide uppercase">Summary</span>
          </div>
          <p className="text-13 leading-160 text-white/90">{summary}</p>
        </div>

        {/* safety note */}
        {facts.safety && (
          <div className="flex items-start gap-10 rounded-12 border border-white/10 bg-white/5 p-12" style={{ color: facts.safety.color }}>
            <Ban className="mt-px size-18 shrink-0" />
            <p className="text-12 leading-140">{facts.safety.text}</p>
          </div>
        )}

        {/* detail rows */}
        <dl className="flex flex-col">
          {facts.rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-12 border-b border-white/6 py-9 last:border-0">
              <dt className="text-12 leading-120 text-white/50">{k}</dt>
              <dd className="tnum truncate text-12 leading-120 font-medium text-white">{v}</dd>
            </div>
          ))}
        </dl>

        {/* contextual actions — the same buttons the modals use */}
        {facts.actions.length > 0 && (
          <div className="flex flex-col gap-8">
            {facts.actions.map((act) => (
              <BaseBtn
                key={act.kind}
                variant="secondary"
                icon={ACTION_ICON[act.kind] ?? Sparkles}
                className={cn("w-full", act.danger && "border-danger/40 bg-danger/10 text-[#ff8a6a] hover:bg-danger/20")}
                onClick={() => onAction(act.kind)}>
                {act.label}
              </BaseBtn>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 px-16 py-11 text-center text-11 leading-140 text-white/40">Right-click any object → Inspect to switch</footer>
    </aside>
  )
}

function Head({ obj }: { obj: Inspectable }) {
  if (obj.class === "person") return <GradientAvatar seed={obj.address ?? obj.id} size={56} className="shrink-0" />
  if (obj.class === "pack")
    return (
      <span className="grid size-56 shrink-0 place-items-center rounded-14 text-24 font-extrabold text-white" style={{ background: obj.color }}>
        {obj.packGlyph ?? "★"}
      </span>
    )
  return (
    <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">
      <ObjectMark obj={obj} size={56} />
    </span>
  )
}
