"use client"

import { ChevronDown, Coins, Gem, Package, Search, type LucideIcon } from "lucide-react"

import { cn, usd } from "@/lib/utils"

export type Filters = { tokens: boolean; packs: boolean; nfts: boolean }
export type FilterKey = keyof Filters

export type SortKey = "value-desc" | "value-asc" | "name" | "chain"

const CHIPS: { key: FilterKey; label: string; icon: LucideIcon }[] = [
  { key: "tokens", label: "Tokens", icon: Coins },
  { key: "packs", label: "Packs", icon: Package },
  { key: "nfts", label: "NFTs", icon: Gem }
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: "value-desc", label: "Value · high to low" },
  { key: "value-asc", label: "Value · low to high" },
  { key: "name", label: "Name · A–Z" },
  { key: "chain", label: "Network" }
]

// The content column's header: the holding's headline value, then the controls that shape the grid.
//
// The design puts the total here — big, monospace, with its change beside it — rather than tucked in a
// corner, so that's what the eye lands on first. The chips, sort and count aren't in the design at all;
// they keep their row under the search rather than being dropped.
//
// The chips start all-on, where a click means "show me only this" rather than "hide this" — from every
// group visible, hiding one is rarely what you meant, and soloing takes one click instead of two.

export function FilterBar({
  query,
  onQuery,
  filters,
  onToggle,
  sort,
  onSort,
  totalUsd,
  delta,
  count
}: {
  query: string
  onQuery: (v: string) => void
  filters: Filters
  onToggle: (k: FilterKey) => void
  sort: SortKey
  onSort: (k: SortKey) => void
  totalUsd: number
  delta: { usd: number; pct: number }
  count: number
}) {
  const down = delta.usd < 0

  return (
    <div className="shrink-0 border-b border-border p-48">
      {/* headline */}
      <p className="text-11 tracking-[0.18em] text-accent uppercase">My Assets</p>
      <div className="mt-8 flex items-baseline gap-12">
        <p className="tnum text-36 leading-100 text-foreground">{usd(totalUsd, { cents: false })}</p>
        <p className={cn("tnum text-13", down ? "text-danger" : "text-success")}>
          {down ? "-" : "+"}
          {usd(Math.abs(delta.usd))} [{delta.pct > 0 ? "+" : ""}
          {delta.pct.toFixed(2)}%]
        </p>
      </div>

      <div className="mt-24 flex items-center gap-16">
        {/* search */}
        <div className="flex h-36 w-320 items-center gap-8 border border-border bg-card/50 px-12 xl:w-240 m:w-full">
          <Search className="size-15 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search assets"
            className="w-full bg-transparent text-12 tracking-[0.08em] text-foreground uppercase outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/* quick filters */}
        <div className="flex items-center gap-6 m:hidden">
          {CHIPS.map((c) => {
            const on = filters[c.key]
            const Icon = c.icon
            return (
              <button
                key={c.key}
                onClick={() => onToggle(c.key)}
                aria-pressed={on}
                className={cn(
                  "flex h-32 items-center gap-6 border px-12 text-11 tracking-[0.08em] uppercase trans-base",
                  on ? "border-accent/50 bg-accent-dim/60 text-accent" : "border-border text-muted-foreground/70 hover:text-foreground"
                )}
              >
                <Icon className="size-14" />
                {c.label}
              </button>
            )
          })}
        </div>

        {/* sort — a real select, so the list is the platform's own. Cheaper and more accessible than a
            hand-rolled popover, and "never fake an OS" cuts both ways (spec §3.1 / DEV2). */}
        <div className="relative m:hidden">
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            aria-label="Sort assets"
            className="h-32 cursor-pointer appearance-none border border-border bg-card/40 pr-30 pl-12 text-11 tracking-[0.08em] text-muted-foreground uppercase outline-none trans-base hover:border-accent/50 hover:text-foreground focus-visible:border-accent [&>option]:bg-surface [&>option]:text-foreground"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-10 size-14 -translate-y-1/2 text-muted-foreground/70" />
        </div>

        {/* the total moved up into the headline, so only the count belongs out here now */}
        <span className="tnum ml-auto text-11 tracking-[0.08em] text-muted-foreground uppercase l:hidden">
          <span className="text-foreground">{count}</span> items
        </span>
      </div>
    </div>
  )
}
