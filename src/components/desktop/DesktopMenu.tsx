"use client"

import { Fragment, createElement, useEffect, useLayoutEffect, useRef, useState } from "react"

import { Check, ChevronRight, type LucideIcon } from "lucide-react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

export type DesktopMenuItem = {
  label: string
  icon?: LucideIcon
  danger?: boolean
  checked?: boolean
  separator?: boolean
  children?: DesktopMenuItem[]
  onSelect?: () => void
}

const EDGE = 12
const FLYOUT_W = 160
const FLYOUT_GAP = 2

export function DesktopMenu({ x, y, items, onClose }: { x: number; y: number; items: DesktopMenuItem[]; onClose: () => void }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)

  // state
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null)

  // effects
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const px = Math.min(x, window.innerWidth - el.offsetWidth - EDGE)
    const py = Math.min(y, window.innerHeight - el.offsetHeight - EDGE)
    el.style.transform = `translate(${Math.max(EDGE, px)}px, ${Math.max(EDGE, py)}px)`
  }, [x, y, items.length])

  // effects
  useEffect(() => {
    const onPress = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || subRef.current?.contains(t)) return

      e.preventDefault()
      e.stopPropagation()
      onClose()
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })

      window.setTimeout(() => window.removeEventListener("click", swallow, true), 350)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("pointerdown", onPress, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onPress, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const pick = (it: DesktopMenuItem) => {
    if (it.children) return
    it.onSelect?.()
    onClose()
  }

  const children = sub ? items[sub.index]?.children : null
  const flyLeft = sub ? sub.rect.right + FLYOUT_GAP + FLYOUT_W > window.innerWidth : false

  return (
    <div ref={ref} className="fixed top-0 left-0 z-[940]" onContextMenu={(e) => e.preventDefault()}>
      <div className="panel panel-in w-180 origin-top-left rounded-md p-4">
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {it.separator && <div className="mx-8 my-4 border-t border-white/10" aria-hidden />}
            <div onPointerEnter={(e) => setSub(it.children ? { index: i, rect: e.currentTarget.getBoundingClientRect() } : null)}>
              <button
                onClick={() => pick(it)}
                className={cn(
                  "flex w-full items-center gap-8 rounded-4 px-8 py-8 text-left text-12 font-medium leading-120 tracking-tight trans-base",
                  sub?.index === i && "bg-white/10",
                  it.danger ? "text-danger hover:bg-danger/15" : "text-white hover:bg-white/10"
                )}>
                {it.icon && createElement(it.icon, { className: cn("size-16 shrink-0", it.danger ? "text-danger" : "text-white/80") })}
                <span className="flex-1 truncate">{it.label}</span>
                {it.children && <ChevronRight className="size-12 shrink-0 text-white/50" />}
              </button>
            </div>
          </Fragment>
        ))}
      </div>

      {sub &&
        children &&
        createPortal(
          <div
            ref={subRef}
            style={{ top: sub.rect.top - 4, left: flyLeft ? sub.rect.left - FLYOUT_GAP - FLYOUT_W : sub.rect.right + FLYOUT_GAP }}
            className="panel panel-in fixed z-[941] w-160 rounded-md p-4"
            onContextMenu={(e) => e.preventDefault()}>
            {children.map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  c.onSelect?.()
                  onClose()
                }}
                className="flex w-full items-center justify-between gap-8 rounded-4 px-8 py-8 text-left text-12 font-medium leading-120 tracking-tight text-white trans-base hover:bg-white/10">
                {c.label}
                {c.checked && <Check className="size-12 shrink-0 text-white" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
