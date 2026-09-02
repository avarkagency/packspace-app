"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { AssetObj, PackObj, PersonObj } from "@/types/objects"
import { CornerDownLeft, Search, X } from "lucide-react"

import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { objectNameColor } from "@/components/desktop/object/ObjectVisual"

import { cn, shortAddr, units, usd } from "@/lib/utils"

import { ObjectAvatar } from "./object/ObjectAvatar"

export type SearchItem = AssetObj | PersonObj | PackObj

type Category = "Tokens" | "NFTs" | "Packs" | "Contacts"
const CATEGORY_ORDER: Category[] = ["Tokens", "NFTs", "Packs", "Contacts"]

function categoryOf(obj: SearchItem): Category {
  if (obj.class === "pack") return "Packs"
  if (obj.class === "person") return "Contacts"
  return obj.kind === "nft" ? "NFTs" : "Tokens"
}

function haystack(obj: SearchItem): string {
  if (obj.class === "asset") return `${obj.label} ${obj.symbol} ${obj.kind} ${obj.chain ?? ""} ${obj.address ?? ""}`.toLowerCase()
  if (obj.class === "pack") return `${obj.label} pack ${obj.contents} ${obj.chain ?? ""}`.toLowerCase()
  return `${obj.label} ${obj.handle} ${obj.chain ?? ""} ${obj.address ?? ""} contact`.toLowerCase()
}

function usdOf(obj: SearchItem): number {
  return obj.class === "person" ? 0 : obj.usd
}

function subtitle(obj: SearchItem): string {
  if (obj.class === "asset") {
    if (obj.kind === "nft") return `${obj.symbol} · ${obj.verified === false ? "Unverified" : usd(obj.usd, { cents: false })}`
    return `${units(obj.balance)} ${obj.symbol} · ${obj.verified === false ? "Unverified" : usd(obj.usd, { cents: false })}`
  }
  if (obj.class === "pack") return `${obj.meta ?? obj.contents} · ${usd(obj.usd, { cents: false })}`
  return obj.handle === "unconfirmed" && obj.address ? shortAddr(obj.address) : obj.handle
}

function rank(obj: SearchItem, q: string): number | null {
  if (!q) return 0
  const label = obj.label.toLowerCase()
  const primary = obj.class === "asset" ? obj.symbol.toLowerCase() : obj.class === "person" ? obj.handle.toLowerCase() : label
  if (label.startsWith(q)) return 0
  if (primary.startsWith(q)) return 1
  if (label.includes(q)) return 2
  return haystack(obj).includes(q) ? 3 : null
}

type Props = {
  items: SearchItem[]
  onSelect: (id: string) => void
  onItemContextMenu: (obj: SearchItem, e: React.MouseEvent) => void
  onClose: () => void
}

export function DesktopSearch({ items, onSelect, onItemContextMenu, onClose }: Props) {
  // refs
  const inputRef = useRef<HTMLInputElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // state
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [lastQuery, setLastQuery] = useState(query)

  // data
  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    const scored = items.map((obj) => ({ obj, r: rank(obj, q) })).filter((x): x is { obj: SearchItem; r: number } => x.r !== null)
    return CATEGORY_ORDER.flatMap((cat) =>
      scored
        .filter((x) => categoryOf(x.obj) === cat)
        // within a group: best match first, then the heavier holding (contacts carry no value)
        .sort((a, b) => a.r - b.r || usdOf(b.obj) - usdOf(a.obj))
        .map((x) => ({ ...x, cat }))
    )
  }, [items, q])

  if (query !== lastQuery) {
    setLastQuery(query)
    setActive(0)
  }

  // events
  const choose = (id: string) => {
    onSelect(id)
    onClose()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      return setActive((i) => (results.length ? (i + 1) % results.length : 0))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      return setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const hit = results[active]
      if (hit) choose(hit.obj.id)
    }
  }

  // effects
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" })
  }, [active])

  return (
    <div className="fixed inset-0 z-[210] flex justify-center px-24 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" aria-label="Close search" data-no-cue onClick={onClose} className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm" />

      <div className="panel-in panel relative flex max-h-[62vh] w-full max-w-640 flex-col overflow-hidden rounded-20" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-12 border-b border-white/10 px-20">
          <Search className="size-16 shrink-0 text-white/50" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, NFTs, contacts, packs…"
            aria-label="Search"
            className="h-56 min-w-0 flex-1 bg-transparent text-18 leading-120 tracking-tight text-white outline-none placeholder:text-white/40"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="grid size-24 shrink-0 place-items-center rounded-full text-white/50 trans-base hover:bg-white/10 hover:text-white">
              <X className="size-14" />
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="grid place-items-center px-20 py-40 text-14 leading-140 text-white/50">No matches for “{query}”</div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            {results.map((hit, i) => {
              const first = i === 0 || results[i - 1].cat !== hit.cat
              return (
                <div key={hit.obj.id}>
                  {first && <p className="px-12 pt-8 pb-4 text-11 leading-120 font-bold tracking-wide text-white/40 uppercase">{hit.cat}</p>}
                  <ResultRow
                    ref={i === active ? activeRef : undefined}
                    obj={hit.obj}
                    active={i === active}
                    onHover={() => setActive(i)}
                    onSelect={() => choose(hit.obj.id)}
                    onContextMenu={(e) => {
                      setActive(i)
                      onItemContextMenu(hit.obj, e)
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 px-16 py-10 text-11 leading-120 text-white/40">
          <span>
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-12">
            <span className="flex items-center gap-4">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-4">
              <Kbd>
                <CornerDownLeft className="size-11" />
              </Kbd>
              open
            </span>
            <span className="flex items-center gap-4">
              <Kbd>esc</Kbd>
              close
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

const ResultRow = ({
  ref,
  obj,
  active,
  onHover,
  onSelect,
  onContextMenu
}: {
  ref?: React.Ref<HTMLButtonElement>
  obj: SearchItem
  active: boolean
  onHover: () => void
  onSelect: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) => (
  <button
    ref={ref}
    type="button"
    onPointerMove={onHover}
    onClick={onSelect}
    onContextMenu={onContextMenu}
    className={cn("flex w-full items-center gap-12 rounded-12 px-12 py-8 text-left trans-base", active ? "bg-white/15" : "hover:bg-white/5")}>
    <ResultMark obj={obj} />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-14 leading-120 font-medium" style={{ color: objectNameColor(obj) }}>
        {obj.label}
      </span>
      <span className="mt-2 block truncate text-12 leading-120 text-white/50">{subtitle(obj)}</span>
    </span>
    {active && <CornerDownLeft className="size-14 shrink-0 text-white/40" />}
  </button>
)

function ResultMark({ obj }: { obj: SearchItem }) {
  if (obj.class === "person") return <ObjectAvatar contact={obj} size={40} />
  if (obj.class === "pack")
    return (
      <span className="grid size-40 shrink-0 place-items-center rounded-12 text-18 font-extrabold text-white" style={{ background: obj.color }}>
        {obj.packGlyph ?? "★"}
      </span>
    )
  return <ObjectMark obj={obj} size={40} />
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid h-16 min-w-16 place-items-center rounded-4 border border-white/15 bg-white/10 px-4 text-10 leading-120 font-medium text-white/70">
      {children}
    </kbd>
  )
}
