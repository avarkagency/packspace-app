// The desktop's widget system. Widgets live in a 2-column bento pinned to the top-right corner: each
// widget spans 1 or 2 columns, and a 1-column widget can be pinned to column 1 or 2 (leaving a gap the
// next widget fills). The list is ordered; `packWidgets` turns that order + each widget's span/column
// into explicit grid (row, column) placements the grid renders from. No persistence — like the rest of
// the desk, the arrangement is in-memory only.

export type WidgetType = "balance" | "nft"

export type WidgetInstance = {
  id: string
  type: WidgetType
  span: 1 | 2
  /** A 1-span widget can be pinned to a column; unset means "first free cell". Ignored when span is 2. */
  col?: 1 | 2
}

/** The addable widget types — drives the "Add Widget ▸" submenus and the span a fresh one takes. */
export const WIDGET_TYPES: { type: WidgetType; label: string; defaultSpan: 1 | 2 }[] = [
  { type: "balance", label: "Balance", defaultSpan: 2 },
  { type: "nft", label: "NFT Collection", defaultSpan: 2 }
]

export type PlacedWidget = WidgetInstance & { row: number; column: 1 | 2 }

/** Pack the ordered list into the 2-column grid. A 2-span widget takes the next fully-empty row; a
 *  pinned 1-span takes its column in the first row where that cell is free; an unpinned 1-span takes the
 *  next free cell (column 1 before 2). Returns each widget with a 0-based row and a 1-based column. */
export function packWidgets(widgets: WidgetInstance[]): PlacedWidget[] {
  const rows: [boolean, boolean][] = []
  const taken = (r: number, c: 0 | 1): boolean => {
    while (rows.length <= r) rows.push([false, false])
    return rows[r][c]
  }

  const placed: PlacedWidget[] = []
  for (const w of widgets) {
    if (w.span === 2) {
      let r = 0
      while (taken(r, 0) || taken(r, 1)) r++
      rows[r][0] = rows[r][1] = true
      placed.push({ ...w, row: r, column: 1 })
      continue
    }
    if (w.col) {
      const c = (w.col - 1) as 0 | 1
      let r = 0
      while (taken(r, c)) r++
      rows[r][c] = true
      placed.push({ ...w, row: r, column: w.col })
      continue
    }
    let r = 0
    for (;;) {
      if (!taken(r, 0)) {
        rows[r][0] = true
        placed.push({ ...w, row: r, column: 1 })
        break
      }
      if (!taken(r, 1)) {
        rows[r][1] = true
        placed.push({ ...w, row: r, column: 2 })
        break
      }
      r++
    }
  }
  return placed
}
