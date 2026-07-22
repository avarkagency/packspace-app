"use client"

import { Fragment, createElement, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Check, ChevronRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// The right-click menu — options anchored to the spot where the gesture happened. An item can carry a
// flyout submenu (macOS "Clean Up By ▸" style), which opens on hover beside its row.
// Dismisses on outside press, Escape, or after any selection.
//
// The flyout is PORTALED to <body>, not nested in the menu: the menu's backdrop blur makes it a
// backdrop root, and a child's backdrop-filter can only sample what's painted inside that root — a
// nested flyout hanging outside its parent would blur nothing and read as flat glass.

export type DesktopMenuItem = {
  label: string
  /** The row's mark, drawn at 16px on the left. */
  icon?: LucideIcon
  danger?: boolean
  /** This option is the one currently in effect — ticked on the right. */
  checked?: boolean
  /** Draw a group divider above this item. */
  separator?: boolean
  /** Selecting closes the menu; an item with children opens its flyout on hover instead. */
  onSelect?: () => void
  children?: DesktopMenuItem[]
}

const EDGE = 12
const FLYOUT_W = 160
const FLYOUT_GAP = 2

export function DesktopMenu({ x, y, items, onClose }: { x: number; y: number; items: DesktopMenuItem[]; onClose: () => void }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)

  // state — which item's flyout is open, anchored to its row's measured box
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null)

  // effects — clamp inside the viewport before the first paint, flipping like any context menu would
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const px = Math.min(x, window.innerWidth - el.offsetWidth - EDGE)
    const py = Math.min(y, window.innerHeight - el.offsetHeight - EDGE)
    el.style.transform = `translate(${Math.max(EDGE, px)}px, ${Math.max(EDGE, py)}px)`
  }, [x, y, items.length])

  // effects — capture-phase, so a press anywhere that isn't the menu (or its portaled flyout) closes
  // it before it does anything else
  useEffect(() => {
    const onPress = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !subRef.current?.contains(t)) onClose()
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
    // positioning transform lives on this outer div; the entrance animation animates transform too, so
    // it has to run on the inner one or it would override the translate for its whole duration
    <div ref={ref} className="fixed top-0 left-0 z-[940]" onContextMenu={(e) => e.preventDefault()}>
      <div className="panel panel-in w-180 origin-top-left rounded-md p-4">
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {it.separator && <div className="mx-8 my-4 border-t border-white/10" aria-hidden />}
            <div
              onPointerEnter={(e) => setSub(it.children ? { index: i, rect: e.currentTarget.getBoundingClientRect() } : null)}>
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
