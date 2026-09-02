export type WidgetType = "balance" | "nft"

export type WidgetInstance = {
  id: string
  type: WidgetType
  span: 1 | 2
  col?: 1 | 2
}

export const WIDGET_TYPES: { type: WidgetType; label: string; defaultSpan: 1 | 2 }[] = [
  { type: "balance", label: "Balance", defaultSpan: 2 },
  { type: "nft", label: "NFT Collection", defaultSpan: 2 }
]

export type PlacedWidget = WidgetInstance & { row: number; column: 1 | 2 }

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
