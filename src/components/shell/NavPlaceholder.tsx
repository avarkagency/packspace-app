"use client"

import { Construction, type LucideIcon } from "lucide-react"

// Empty state for the docs-backed but unbuilt nav pages (Activity, dApps, Approvals). The pages
// themselves are intentionally out of scope for this prototype.

export function NavPlaceholder({ icon: Icon, title, blurb, items }: { icon: LucideIcon; title: string; blurb: string; items?: string[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-16 p-40 text-center">
      <span className="grid size-64 place-items-center rounded-2xl border border-border bg-card/60 text-accent">
        <Icon className="size-28" strokeWidth={1.5} />
      </span>
      <div className="max-w-420">
        <h2 className="text-20 font-semibold">{title}</h2>
        <p className="mt-6 text-13 leading-140 text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex items-center gap-6 rounded-md border border-warning/30 bg-warning/5 px-12 py-8 text-12 text-warning">
        <Construction className="size-14" /> Page not built in this prototype
      </div>
      {items && items.length > 0 && (
        <div className="flex max-w-480 flex-wrap justify-center gap-6">
          {items.map((i) => (
            <span key={i} className="rounded-md border border-border px-10 py-4 text-11 text-muted-foreground">
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
