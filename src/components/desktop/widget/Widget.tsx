"use client"

import { useEffect, useRef, useState } from "react"

import type { AssetObj } from "@/types/objects"
import { Columns2, Maximize2, Minimize2, Plus, Trash2 } from "lucide-react"

import { DesktopMenu, type DesktopMenuItem } from "@/components/desktop/DesktopMenu"

import { cue } from "@/lib/sound"
import { cn } from "@/lib/utils"
import type { Wallet } from "@/lib/wallets"
import { WIDGET_TYPES, type WidgetInstance, type WidgetType, packWidgets } from "@/lib/widgets"

import { WidgetBalance } from "./WidgetBalance"
import { WidgetNft } from "./WidgetNft"

// The top-right widget bento. A 2-column grid (columns fixed so a 2-span widget matches the old balance
// card's width); `packWidgets` turns the ordered list into explicit (row, column) placements. Widgets
// rearrange by drag — drop onto any part of another widget to swap their slots, or drop a 1-column widget
// into the empty column to move it there — and while dragging, the grid's cells show as faint guides with
// the drop target lit. The right-click menu still offers resize / pin-to-column / remove / add, and its
// "Add Widget" mirrors the desktop-background menu's, so both add from the same registry.

const COL_W = 160
const GAP = 8
/** The base row height — a 1-column widget is (near enough) a square, and every widget shares it so the
 *  grid stays even however the Balance widget's content changes between its 1- and 2-column forms. */
const ROW_H = 160

type Props = {
  widgets: WidgetInstance[]
  setWidgets: (updater: (ws: WidgetInstance[]) => WidgetInstance[]) => void
  assets: AssetObj[]
  /** Whose desk this grid belongs to. Each wallet keeps its own arrangement — see Desktop. */
  wallet: Wallet
  onAdd: (type: WidgetType) => void
  /** Report the grid's live keep-out box (px in from the top-right corner) so the desk clamps icons off it. */
  onKeepoutChange?: (w: number, h: number) => void
}

function renderWidget(w: WidgetInstance, assets: AssetObj[], wallet: Wallet) {
  if (w.type === "balance") return <WidgetBalance assets={assets} span={w.span} wallet={wallet} />
  return <WidgetNft assets={assets} span={w.span} />
}

/** A drag's landing spot: onto another widget (swap slots), or into an empty cell (move there). */
type Drop = { kind: "swap"; overId: string } | { kind: "cell"; row: number; col: 1 | 2 }

export function Widget({ widgets, setWidgets, assets, wallet, onAdd, onKeepoutChange }: Props) {
  // refs
  const gridRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLElement>())

  // state
  const [menu, setMenu] = useState<{ x: number; y: number; id: string | null } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)

  // data
  const placed = packWidgets(widgets)

  // effects
  useEffect(() => {
    const el = gridRef.current
    if (!el || !onKeepoutChange) return
    const report = () => {
      const r = el.getBoundingClientRect()
      onKeepoutChange(Math.max(392, Math.round(window.innerWidth - r.left) + 8), Math.round(r.bottom) + 8)
    }
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onKeepoutChange])

  // events
  const toggleSize = (id: string) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, span: w.span === 1 ? 2 : 1, col: undefined } : w)))
  const setCol = (id: string, col: 1 | 2) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, col } : w)))
  const remove = (id: string) => setWidgets((ws) => ws.filter((w) => w.id !== id))

  // events
  const swap = (a: string, b: string) =>
    setWidgets((ws) => {
      const ia = ws.findIndex((w) => w.id === a)
      const ib = ws.findIndex((w) => w.id === b)
      if (ia < 0 || ib < 0) return ws
      const next = [...ws]
      next[ia] = { ...ws[ib], col: ws[ia].col }
      next[ib] = { ...ws[ia], col: ws[ib].col }
      return next
    })

  // events
  const moveToCell = (id: string, row: number, col: 1 | 2) =>
    setWidgets((ws) => {
      const item = ws.find((w) => w.id === id)
      if (!item) return ws
      const rowOf = new Map(placed.map((p) => [p.id, p.row]))
      const rest = ws.filter((w) => w.id !== id)
      let idx = rest.findIndex((w) => (rowOf.get(w.id) ?? Infinity) >= row)
      if (idx < 0) idx = rest.length
      rest.splice(idx, 0, item.span === 1 ? { ...item, col } : { ...item, col: undefined })
      return rest
    })

  // events
  const rowBands = () => {
    const bands = new Map<number, { top: number; bottom: number }>()
    for (const p of placed) {
      const r = cellRefs.current.get(p.id)?.getBoundingClientRect()
      if (!r) continue
      const prev = bands.get(p.row)
      bands.set(p.row, { top: Math.min(prev?.top ?? r.top, r.top), bottom: Math.max(prev?.bottom ?? r.bottom, r.bottom) })
    }
    return bands
  }

  // events
  const targetAt = (x: number, y: number, dragging: string): Drop | null => {
    const g = gridRef.current?.getBoundingClientRect()
    if (!g || x < g.left - 12 || x > g.right + 12 || y < g.top - 12) return null
    const col: 1 | 2 = x < g.left + g.width / 2 ? 1 : 2

    for (const p of placed) {
      if (p.id === dragging) continue
      const r = cellRefs.current.get(p.id)?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { kind: "swap", overId: p.id }
    }

    for (const [row, b] of rowBands()) if (y >= b.top && y <= b.bottom) return { kind: "cell", row, col }
    const maxRow = placed.reduce((m, p) => Math.max(m, p.row), -1)
    return y > g.bottom ? { kind: "cell", row: maxRow + 1, col } : null
  }

  const applyDrop = (id: string, t: Drop) => (t.kind === "swap" ? swap(id, t.overId) : moveToCell(id, t.row, t.col))

  // events
  const onCellPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const start = { x: e.clientX, y: e.clientY }
    let lifted = false

    const onMove = (ev: PointerEvent) => {
      if (!lifted) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return
        lifted = true
        setDragId(id)
      }
      setDrop(targetAt(ev.clientX, ev.clientY, id))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      if (lifted) {
        const t = targetAt(ev.clientX, ev.clientY, id)
        if (t) applyDrop(id, t)
      }
      setDragId(null)
      setDrop(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // data
  const addable = WIDGET_TYPES.filter((t) => !widgets.some((w) => w.type === t.type))
  const addItem: DesktopMenuItem | null = addable.length
    ? { label: "Add Widget", icon: Plus, children: addable.map((t) => ({ label: t.label, onSelect: () => onAdd(t.type) })) }
    : null

  // data
  const menuItems = (w: WidgetInstance): DesktopMenuItem[] => {
    const items: DesktopMenuItem[] = [
      w.span === 2
        ? { label: "Shrink to 1 column", icon: Minimize2, onSelect: () => toggleSize(w.id) }
        : { label: "Expand to 2 columns", icon: Maximize2, onSelect: () => toggleSize(w.id) }
    ]
    if (w.span === 1)
      items.push({
        label: "Move to column",
        icon: Columns2,
        children: [
          { label: "Column 1", checked: w.col === 1, onSelect: () => setCol(w.id, 1) },
          { label: "Column 2", checked: w.col === 2, onSelect: () => setCol(w.id, 2) }
        ]
      })
    items.push({ label: "Remove", icon: Trash2, danger: true, onSelect: () => remove(w.id) })
    if (addItem) items.push({ ...addItem, separator: true })
    return items
  }

  // the menu's items: a widget's own menu when it carries an id, else the empty-area add menu
  const menuWidget = menu?.id ? widgets.find((w) => w.id === menu.id) : null
  const items = menu ? (menuWidget ? menuItems(menuWidget) : addItem ? [addItem] : []) : []

  return (
    <>
      <div
        ref={gridRef}
        onContextMenu={(e) => {
          // right-click on an empty cell / the grid's own box → the add menu (widget cells stop this)
          e.preventDefault()
          cue("tick")
          setMenu({ x: e.clientX, y: e.clientY, id: null })
        }}
        className="fixed top-48 right-8 z-[100] grid"
        style={{ gridTemplateColumns: `repeat(2, ${COL_W}px)`, gridAutoRows: `minmax(${ROW_H}px, max-content)`, gap: GAP }}>
        {/* while dragging, the grid's empty cells show as faint guides, with the drop target lit. The cells
            under the dragged widget itself are skipped — it still sits there, and a 2-column widget must not
            read as two split slots. */}
        {dragId &&
          (() => {
            const dp = placed.find((p) => p.id === dragId)
            const rowsN = placed.reduce((m, p) => Math.max(m, p.row + 1), 0)
            const guides = []
            for (let r = 0; r < rowsN; r++)
              for (const c of [1, 2] as const) {
                if (dp && dp.row === r && (dp.span === 2 || dp.column === c)) continue
                const lit = drop?.kind === "cell" && drop.row === r && drop.col === c
                guides.push(
                  <div
                    key={`guide-${r}-${c}`}
                    aria-hidden
                    style={{ gridColumn: c, gridRow: r + 1 }}
                    className={cn("pointer-events-none rounded-16 border border-dashed trans-base", lit ? "border-white/70 bg-white/5" : "border-white/20")}
                  />
                )
              }
            return guides
          })()}
        {placed.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) cellRefs.current.set(p.id, el)
              else cellRefs.current.delete(p.id)
            }}
            data-cue-press
            onPointerDown={onCellPointerDown(p.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              cue("tick")
              setMenu({ x: e.clientX, y: e.clientY, id: p.id })
            }}
            style={{ gridColumn: p.span === 2 ? "1 / span 2" : String(p.column), gridRow: p.row + 1 }}
            className={cn(
              "relative cursor-grab touch-none select-none rounded-16 trans-base active:cursor-grabbing",
              dragId === p.id && "opacity-40",
              drop?.kind === "swap" && drop.overId === p.id && "outline-1 outline-dashed outline-white"
            )}>
            {renderWidget(p, assets, wallet)}
          </div>
        ))}
      </div>

      {menu && items.length > 0 && <DesktopMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </>
  )
}
