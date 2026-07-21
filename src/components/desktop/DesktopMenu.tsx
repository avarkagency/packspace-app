"use client"

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react"

import { Check, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// The right-click menu — options anchored to the spot where the gesture happened. An item can carry a
// flyout submenu (macOS "Clean Up By ▸" style), which opens on hover beside its row.
// Dismisses on outside press, Escape, or after any selection.

export type DesktopMenuItem = {
  label: string
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
/** Roughly the menu plus its flyout — if that doesn't fit to the right, the flyout opens leftward. */
const FLYOUT_SPAN = 348

export function DesktopMenu({ x, y, items, onClose }: { x: number; y: number; items: DesktopMenuItem[]; onClose: () => void }) {
  // refs
  const ref = useRef<HTMLDivElement>(null)

  // state — which item's flyout is open
  const [sub, setSub] = useState<number | null>(null)

  // effects — clamp inside the viewport before the first paint, flipping like any context menu would
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const px = Math.min(x, window.innerWidth - el.offsetWidth - EDGE)
    const py = Math.min(y, window.innerHeight - el.offsetHeight - EDGE)
    el.style.transform = `translate(${Math.max(EDGE, px)}px, ${Math.max(EDGE, py)}px)`
  }, [x, y, items.length])

  // effects — capture-phase, so a press anywhere that isn't the menu closes it before it does anything else
  useEffect(() => {
    const onPress = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
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
  // menus only exist after a real right-click, so window is always there to measure
  const flyLeft = x + FLYOUT_SPAN > window.innerWidth

  return (
    // positioning transform lives on this outer div; the entrance animation animates transform too, so
    // it has to run on the inner one or it would override the translate for its whole duration
    <div ref={ref} className="fixed top-0 left-0 z-[940]" onContextMenu={(e) => e.preventDefault()}>
      <div className="panel panel-in w-180 origin-top-left rounded-lg p-4">
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {it.separator && <div className="mx-8 my-4 border-t border-border" aria-hidden />}
            <div className="relative" onPointerEnter={() => setSub(it.children ? i : null)}>
              <button
                onClick={() => pick(it)}
                className={cn(
                  "flex w-full items-center justify-between gap-8 rounded-md px-8 py-6 text-left text-13 trans-base",
                  sub === i && "bg-muted",
                  it.danger ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-muted"
                )}>
                {it.label}
                {it.children && <ChevronRight className="size-12 shrink-0 text-muted-foreground" />}
              </button>

              {it.children && sub === i && (
                <div className={cn("panel absolute -top-4 w-160 rounded-lg p-4", flyLeft ? "right-full mr-2" : "left-full ml-2")}>
                  {it.children.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => {
                        c.onSelect?.()
                        onClose()
                      }}
                      className="flex w-full items-center justify-between gap-8 rounded-md px-8 py-6 text-left text-13 text-foreground trans-base hover:bg-muted">
                      {c.label}
                      {c.checked && <Check className="size-12 shrink-0 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
