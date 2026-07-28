"use client"

import Image from "next/image"

import { GripVertical } from "lucide-react"

import { DIVIDER_W, type Pane, SPLIT_MAX, SPLIT_MIN } from "@/lib/pane"
import { shortAddr } from "@/lib/utils"
import { WALLETS, type Wallet } from "@/lib/wallets"

// Split view's furniture: the two wallpapers, the pane labels, and the divider between them.
//
// Backgrounds only — the objects themselves stay in the workspace's single absolute layer above this,
// positioned into each pane by the pane maths. Keeping them out of the panes is what lets an object in
// hand fly across the divider (and lets its 3D coin, drawn by one full-screen canvas that knows nothing
// about panes, follow it).
//
// Each wallet brings its own wallpaper, so the two halves are told apart by the desk itself rather than
// by a tint laid over it.

/** How far down the pane labels sit. The floating search / mute / view-switcher cluster owns the
 *  top-right corner down to 40px, and the right pane's label starts underneath it — level with that
 *  cluster the label simply disappears behind it. Exported so the split layout starts below them. */
export const LABEL_TOP = 48

/** The label pill's own height — a 16px mark and 12px text in a py-6 pill. */
export const LABEL_H = 28

type Props = {
  panes: Record<Wallet, Pane>
  /** Each wallet's wallpaper, as a CSS `background` shorthand. */
  wallpapers: Record<Wallet, string>
  ratio: number
  onRatioChange: (ratio: number) => void
  /** The drag ended — the desk settles collisions once, rather than on every frame. */
  onRatioCommit: () => void
}

export function SplitPanes({ panes, wallpapers, ratio, onRatioChange, onRatioCommit }: Props) {
  // events — the divider. Dragging it re-proportions the two panes live; the workspace re-clamps every
  // icon off the back of the ratio change, so nothing is left stranded under the other half.
  const onDividerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const onMove = (ev: PointerEvent) => onRatioChange(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ev.clientX / window.innerWidth)))
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      onRatioCommit()
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const wallets = Object.keys(panes) as Wallet[]

  return (
    <>
      {wallets.map((w) => {
        const pane = panes[w]
        return (
          <div
            key={w}
            aria-hidden
            className="pointer-events-none fixed overflow-hidden"
            style={{ left: pane.left, top: pane.top, width: pane.width, height: pane.height }}>
            {/* the wallpaper is drawn at full viewport size and slid back by the pane's offset, so a
                narrow pane shows a CROP of the image rather than a squashed copy of the whole thing */}
            <div className="absolute top-0 h-screen w-screen" style={{ left: -pane.left, background: wallpapers[w] }} />
            <div className="absolute inset-0 shadow-[inset_0_0_240px_rgba(0,0,0,0.5)]" />
          </div>
        )
      })}

      {/* pane labels — which wallet this half is, and the address it holds. Sat below the floating
          search / view chrome rather than beside it: the right pane's label starts under that cluster,
          so anything level with it disappears behind the toggles. */}
      {wallets.map((w) => {
        const pane = panes[w]
        const spec = WALLETS[w]
        return (
          <div
            key={`label-${w}`}
            className="glass pointer-events-none fixed z-[90] flex items-center gap-8 rounded-full px-12 py-6"
            style={{ left: pane.left + 16, top: LABEL_TOP, maxWidth: Math.max(0, pane.width - 32) }}>
            <Image src={spec.image} alt="" width={16} height={16} unoptimized className="size-16 shrink-0" />
            <span className="truncate text-12 leading-120 tracking-tight text-white">{spec.provider}</span>
            <span className="tnum shrink-0 font-mono text-10 leading-120 text-white/60">{shortAddr(spec.address)}</span>
          </div>
        )
      })}

      {/* the divider — a hairline rule with a grab handle, above the desk but below the modals */}
      <div
        onPointerDown={onDividerDown}
        onContextMenu={(e) => e.preventDefault()}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize wallet panes"
        aria-valuenow={Math.round(ratio * 100)}
        className="fixed top-0 bottom-0 z-[95] flex cursor-col-resize touch-none items-center justify-center"
        style={{ left: panes.eoa.left - DIVIDER_W / 2, width: DIVIDER_W }}>
        <div className="h-full w-2 bg-white/20" aria-hidden />
        <div className="glass absolute grid h-56 w-28 place-items-center rounded-12 text-white/80" aria-hidden>
          <GripVertical className="size-16" />
        </div>
      </div>
    </>
  )
}
