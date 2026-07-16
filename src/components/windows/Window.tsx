"use client"

import type { ReactNode } from "react"

import { X } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  title: string
  subtitle?: string
  tint?: string
  /** Stands in for the tint dot — the object's own mark, where it has one. */
  icon?: ReactNode
  width?: number
  z?: number
  /** Chamfer two corners off, and outline the panel in its tint — the whole way round, diagonals
   *  included. */
  cut?: boolean
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

// A centered modal dialog with a dimmed backdrop — the conventional desktop-app pattern for
// Send / Trade / Split / Combine / Receipt. (Spec §3.13 calls for movable windows/modals; modals here.)

export function Window({ title, subtitle, tint = "#22d3ee", icon, width = 440, z = 100, cut = false, onClose, footer, children }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-24" style={{ zIndex: z }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/60 duration-200" onClick={onClose} aria-hidden />

      <div
        style={{ width }}
        className={cn(
          "fui-panel-in relative flex max-h-[calc(100vh-96px)] w-full max-w-[calc(100vw-48px)] flex-col",
          cut ? "fui-cut bg-surface/80 backdrop-blur-md" : "fui-glass rounded-xl"
        )}
      >
        {/* The outline rides on top as a hollow ring, rather than sitting behind as a filled layer the
            panel is inset into. That way round there is nothing under the panel but the dimmed backdrop,
            so its 80% reads as the dark blue it's set to — inset over a filled layer, it would sample the
            outline's colour instead and come out the wrong colour entirely. */}
        {cut && <span className="fui-cut-ring pointer-events-none absolute inset-0 z-10 bg-accent/50" aria-hidden />}

        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-12 border-b border-accent/20 px-36 py-30">
            <div className="flex min-w-0 items-center gap-10">
              {icon ?? <span className="size-8 shrink-0 rounded-full" style={{ background: tint, boxShadow: `0 0 10px ${tint}` }} />}
              <div className="min-w-0">
                <h2 className="mb-6 text-15 font-semibold tracking-[0.08em] uppercase leading-120">{title}</h2>
                {subtitle && <p className="truncate text-12 text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-28 shrink-0 place-items-center rounded-md text-muted-foreground trans-base hover:bg-danger/15 hover:text-danger"
              aria-label="Close"
            >
              <X className="size-16" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

          {footer && <footer className="p-32">{footer}</footer>}
        </div>
      </div>
    </div>
  )
}
