"use client"

import { GradientAvatar } from "@outpacelabs/avatars"
import { Settings } from "lucide-react"

import { WALLET } from "@/lib/data"
import { cn, shortAddr } from "@/lib/utils"

export type NavKey = "assets" | "contacts" | "activity" | "dapps" | "approvals"

type Item = { key: NavKey; label: string; count?: number }

// Left top-level navigation. Only "My Assets" is built in this prototype; the docs-backed dApps and
// Approvals surfaces (spec §3.13 / §3.11) are real nav items whose pages are intentionally not built —
// they're no longer grouped apart, so nothing in the rail says which is which.

export function Sidebar({ active, onNav, counts }: { active: NavKey; onNav: (k: NavKey) => void; counts: Record<NavKey, number | undefined> }) {
  const items: Item[] = [
    { key: "assets", label: "My Assets", count: counts.assets },
    { key: "contacts", label: "Contact List", count: counts.contacts },
    { key: "activity", label: "Activity", count: counts.activity },
    { key: "dapps", label: "dApps", count: counts.dapps },
    { key: "approvals", label: "Approvals", count: counts.approvals }
  ]

  return (
    <aside className="flex w-320 shrink-0 flex-col border-r border-border bg-surface/50 backdrop-blur-md">
      {/* logo placeholder — the mark isn't designed yet, so this is the box it lands in */}
      <div className="mx-40 mt-40 mb-30 h-40 w-160 shrink-0 bg-white/10" aria-hidden />

      <nav className="flex min-h-0 flex-1 flex-col gap-11 overflow-y-auto px-20">
        {items.map((it) => (
          <NavRow key={it.key} item={it} active={active === it.key} onClick={() => onNav(it.key)} />
        ))}
      </nav>

      {/* user profile — same rule as a contact: the address seeds the avatar and is what's shown */}
      <div className="m-20 flex items-center gap-10 border border-border bg-card/60 px-12 py-10">
        <GradientAvatar seed={WALLET.address} size={32} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-12 uppercase leading-120">{WALLET.label}</p>
          <p className="tnum truncate text-11 text-muted-foreground">{shortAddr(WALLET.address)}</p>
        </div>
        <button className="grid size-24 place-items-center text-muted-foreground trans-base hover:text-accent" aria-label="Settings">
          <Settings className="size-15" />
        </button>
      </div>
    </aside>
  )
}

function NavRow({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-40 shrink-0 items-center px-20 text-left text-14 font-semibold tracking-normal text-foreground uppercase trans-base",
        active ? "fui-cell-live" : "hover:bg-accent-dim/40"
      )}
    >
      {/* corners rather than an outline — the active row is bracketed, not boxed */}
      {active && <span className="fui-brackets-lines" />}
      <span className="flex-1">{item.label}</span>
      {item.count != null && item.count > 0 && <span className="tnum text-12 text-muted-foreground/70">{item.count}</span>}
    </button>
  )
}
