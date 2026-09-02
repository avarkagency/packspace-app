"use client"

import { useState } from "react"

import type { AssetObj, PackContent } from "@/types/objects"
import { Package, Plus, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { BaseSlider } from "@/components/base/BaseSlider"
import { ObjectMark } from "@/components/desktop/object/ObjectMark"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cn, round4, units } from "@/lib/utils"

const CLASS_BG: Record<string, string> = {
  Product: "linear-gradient(160deg,#6366f1,#4338ca)",
  Randomized: "linear-gradient(160deg,#a855f7,#7c3aed)",
  Transit: "linear-gradient(160deg,#22d3ee,#0e7490)"
}

export type PackDraft = {
  name: string
  packType: "Product"
  standard: string
  lock: "None" | "Password"
  password: string
  color: string
  contents: PackContent[]
}

type Slot = { key: string; asset: AssetObj; amount: number }

type Props = {
  inventory: AssetObj[]
  seed?: AssetObj
  onClose: () => void
  onCreate: (draft: PackDraft) => void
}

export function WindowPackBuilder({ inventory, seed, onClose, onCreate }: Props) {
  // state
  const [name, setName] = useState("New Pack")
  const [standard, setStandard] = useState("ERC-721")
  const [lock, setLock] = useState<"None" | "Password">("None")
  const [password, setPassword] = useState("")
  const [contents, setContents] = useState<Slot[]>(() => (seed && seed.kind === "nft" ? [{ key: seed.id, asset: seed, amount: 1 }] : []))
  const [place, setPlace] = useState<{ asset: AssetObj; amount: number } | null>(() =>
    seed && seed.kind !== "nft" ? { asset: seed, amount: seed.balance } : null
  )

  // data
  const placedOf = (id: string) => contents.filter((c) => c.asset.id === id).reduce((t, c) => t + c.amount, 0)
  const rail = inventory.filter((a) => a.kind === "nft" || a.balance - placedOf(a.id) > 0)

  // events
  const addAsset = (asset: AssetObj) => {
    if (contents.length >= 9) return
    if (asset.kind === "nft") {
      if (contents.some((c) => c.asset.id === asset.id)) return
      setContents((c) => [...c, { key: asset.id, asset, amount: 1 }])
    } else {
      setPlace({ asset, amount: round4(asset.balance - placedOf(asset.id)) })
    }
  }
  const confirmPlace = () => {
    if (!place || place.amount <= 0) return
    setContents((c) => [...c, { key: `${place.asset.id}-${c.length}`, asset: place.asset, amount: place.amount }])
    setPlace(null)
  }
  const removeSlot = (key: string) => setContents((c) => c.filter((s) => s.key !== key))

  const create = () => {
    if (!contents.length) return
    onCreate({
      name: name.trim() || "New Pack",
      packType: "Product",
      standard,
      lock,
      password,
      color: CLASS_BG.Product,
      contents: contents.map((c) => ({
        kind: c.asset.kind === "nft" ? "nft" : "asset",
        refId: c.asset.id,
        label: c.asset.label,
        symbol: c.asset.symbol,
        glyph: c.asset.symbol.slice(0, 1),
        color: c.asset.color,
        amount: c.amount,
        usd: c.asset.kind === "nft" ? c.asset.usd : (c.asset.usd / c.asset.balance) * c.amount,
        chain: c.asset.chain
      }))
    })
    onClose()
  }

  return (
    <WindowShell z={220} width={720} onClose={onClose}>
      <div className="p-28">
        <WindowHeading icon={<Package className="size-20 text-[#8ee6a8]" />} title="Pack Builder" />

        <div className="mt-24 flex gap-16">
          <div className="flex w-160 shrink-0 flex-col gap-8">
            <p className="text-10 font-semibold tracking-wide text-white/45 uppercase">Your assets — tap to add</p>
            <div
              className="no-scrollbar flex max-h-320 flex-col gap-6 overflow-auto pr-2 pb-56"
              style={{
                maskImage: "linear-gradient(to bottom, #000 calc(100% - 56px), transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 56px), transparent)"
              }}>
              {rail.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => addAsset(a)}
                  className="glass flex items-center gap-8 rounded-md p-8 text-left trans-base hover:bg-white/10">
                  <ObjectMark obj={a} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-12 leading-120 font-medium text-white">{a.label}</span>
                    <span className="tnum block text-10 leading-120 text-white/50">{a.kind === "nft" ? "1 of 1" : units(a.balance - placedOf(a.id))}</span>
                  </span>
                </button>
              ))}
              {rail.length === 0 && <p className="text-11 text-white/40">Nothing left to add.</p>}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-16">
            <div>
              <p className="mb-8 text-10 font-semibold tracking-wide text-white/45 uppercase">Pack contents</p>
              <div className="grid grid-cols-3 gap-8">
                {Array.from({ length: 9 }).map((_, i) => {
                  const cell = contents[i]
                  if (!cell) return <div key={i} className="h-64 rounded-md border border-dashed border-white/12" aria-hidden />
                  return (
                    <div key={cell.key} className="relative grid h-64 place-items-center gap-2 rounded-md border border-white/10 bg-white/5 p-4">
                      <ObjectMark obj={cell.asset} size={32} />
                      <span className="tnum text-9 leading-100 text-white/70">
                        {cell.asset.kind === "nft" ? "1 of 1" : `${units(cell.amount)} ${cell.asset.symbol}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(cell.key)}
                        aria-label="Remove"
                        className="absolute top-2 right-2 grid size-16 place-items-center rounded-4 bg-black/40 text-white/80 trans-base hover:text-white">
                        <X className="size-10" />
                      </button>
                    </div>
                  )
                })}
              </div>
              {contents.length === 0 && <p className="mt-8 text-11 text-white/40">Tap assets from the left to add them.</p>}
            </div>

            <label className="flex flex-col gap-6">
              <span className="text-10 font-semibold tracking-wide text-white/45 uppercase">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass rounded-md px-12 py-8 text-14 text-white outline-none placeholder:text-white/40"
                placeholder="New Pack"
              />
            </label>

            <Field label="Class">
              <Opt active>Product</Opt>
            </Field>
            <Field label="Token standard">
              {["ERC-721", "ERC-1155", "ERC-20"].map((s) => (
                <Opt key={s} active={standard === s} disabled={s !== "ERC-721"} onClick={() => setStandard(s)}>
                  {s}
                </Opt>
              ))}
            </Field>
            <Field label="Lock">
              {(["None", "Password"] as const).map((l) => (
                <Opt key={l} active={lock === l} onClick={() => setLock(l)}>
                  {l}
                </Opt>
              ))}
              {lock === "Password" && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password"
                  className="glass ml-4 rounded-md px-10 py-6 text-12 text-white outline-none placeholder:text-white/40"
                />
              )}
            </Field>

            <BaseBtn icon={Package} className="mt-4 w-full" disabled={!contents.length} onClick={create}>
              Create pack
            </BaseBtn>
          </div>
        </div>
      </div>

      {/* place-amount picker */}
      {place && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-16 bg-black/40 p-16" onClick={() => setPlace(null)}>
          <div className="glass w-320 bg-black rounded-16 p-20" onClick={(e) => e.stopPropagation()}>
            <p className="text-14 leading-120 font-medium text-white">Add {place.asset.label}</p>
            <div className="glass mt-16 flex items-baseline gap-8 rounded-md px-12 py-10">
              <input
                type="number"
                value={place.amount}
                min={0}
                max={place.asset.balance}
                onChange={(e) => setPlace((p) => (p ? { ...p, amount: round4(Math.min(place.asset.balance, Math.max(0, Number(e.target.value)))) } : p))}
                className="tnum w-full bg-transparent text-20 font-light text-white outline-none"
                aria-label="Amount"
              />
              <span className="tnum text-12 text-white/60">{place.asset.symbol}</span>
              <button
                type="button"
                onClick={() => setPlace((p) => (p ? { ...p, amount: round4(place.asset.balance - placedOf(place.asset.id)) } : p))}
                className="shrink-0 rounded-full border border-white/20 bg-white/10 px-10 py-4 text-11 font-bold text-white trans-base hover:bg-white/20">
                ALL
              </button>
            </div>
            <div className="mt-12">
              <BaseSlider
                max={place.asset.balance}
                step={place.asset.balance / 100}
                value={place.amount}
                onChange={(v) => setPlace((p) => (p ? { ...p, amount: round4(Math.min(place.asset.balance, Math.max(0, v))) } : p))}
                label={`${units(place.amount)} ${place.asset.symbol}`}
                ariaLabel="Amount"
              />
            </div>
            <div className="mt-16 flex gap-8">
              <BaseBtn variant="secondary" className="flex-1" onClick={() => setPlace(null)}>
                Cancel
              </BaseBtn>
              <BaseBtn icon={Plus} className="flex-1" disabled={place.amount <= 0} onClick={confirmPlace}>
                Add to pack
              </BaseBtn>
            </div>
          </div>
        </div>
      )}
    </WindowShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-8">
      <span className="w-96 shrink-0 text-10 font-semibold tracking-wide text-white/45 uppercase">{label}</span>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </div>
  )
}

function Opt({
  active = false,
  disabled = false,
  onClick,
  children
}: {
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-12 py-6 text-12 leading-120 font-medium trans-base disabled:pointer-events-none disabled:opacity-35",
        active ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
      )}>
      {children}
    </button>
  )
}
