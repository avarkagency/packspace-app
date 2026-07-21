"use client"

import type { ReactNode } from "react"

import { X } from "lucide-react"

type Props = {
  title: string
  subtitle?: string
  tint?: string
  /** Stands in for the tint dot — the object's own mark, where it has one. */
  icon?: ReactNode
  width?: number
  z?: number
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

// A centered modal dialog with a dimmed backdrop — the conventional desktop-app pattern for
// Send / Trade / Split / Combine / Receipt.

export function Window({ title, subtitle, tint = "#71717a", icon, width = 440, z = 100, onClose, footer, children }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-24" style={{ zIndex: z }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/50 duration-200" onClick={onClose} aria-hidden />

      <div style={{ width }} className="panel panel-in relative flex max-h-[calc(100vh-96px)] w-full max-w-[calc(100vw-48px)] flex-col rounded-xl">
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-12 border-b border-border px-20 py-14">
            <div className="flex min-w-0 items-center gap-10">
              {icon ?? <span className="size-8 shrink-0 rounded-full" style={{ background: tint }} />}
              <div className="min-w-0">
                <h2 className="text-14 font-semibold leading-120">{title}</h2>
                {subtitle && <p className="truncate text-12 text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-28 shrink-0 place-items-center rounded-md text-muted-foreground trans-base hover:bg-muted hover:text-foreground"
              aria-label="Close">
              <X className="size-16" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

          {footer && <footer className="border-t border-border px-20 py-14">{footer}</footer>}
        </div>
      </div>
    </div>
  )
}
