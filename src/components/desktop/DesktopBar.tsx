"use client"

import { Search, Volume2, VolumeX } from "lucide-react"

import { cue, toggleMuted, useMuted } from "@/lib/sound"
import { cn } from "@/lib/utils"
import { WALLETS, WALLET_ORDER, type View } from "@/lib/wallets"

// The desktop's top chrome. No longer a solid OS bar: the wallpaper runs to the top edge and the
// chrome floats on it — identity and greeting on the left, the wallet/view toggles on the right. The
// balance card that used to sit here is now the Balance widget in the top-right WidgetGrid, which owns
// the desk's top-right keep-out box (see lib/chrome-keepout).
//
// The view control drives which wallet's desk is on screen: either one on its own, or both side by side
// in Split View. In split the greeting stands down — each pane carries its own wallet label up there,
// and the two would collide.

/** The view tabs — exactly one is ever active. Each wallet, then both at once. Text only: the switcher
 *  is chrome, and the label already says which wallet it is. */
const VIEW_TABS: { view: View; label: string }[] = [
  ...WALLET_ORDER.map((w) => ({ view: w as View, label: WALLETS[w].label })),
  { view: "split", label: "Split View" }
]

type Props = {
  onSearch: () => void
  view: View
  onViewChange: (view: View) => void
}

export function DesktopBar({ onSearch, view, onViewChange }: Props) {
  // hooks — the desktop's sound preference (persisted), for the mute toggle beside search
  const muted = useMuted()

  // events — flip mute; turning sound back on gives itself a click, so the toggle is never silent
  const onToggleSound = () => {
    toggleMuted()
    if (muted) cue("toggle")
  }

  return (
    <>
      {/* identity + greeting — deliberately UNDER everything on the desk. No z-index on purpose: the
          bar renders first, so the icon layer, the canvas (z-50) and the badges all paint over it, and
          an object dragged across the corner flies over the words like paper over a desk blotter.
          Stands down in split view, where the pane labels own that corner. */}
      {view !== "split" && (
        <div className="pointer-events-none fixed top-56 left-32 flex flex-col">
          <div className="flex items-center gap-6">
            <span className="grid size-18 place-items-center rounded-4 border border-white/50 bg-white/20 text-12 font-bold text-white">P</span>
            <span className="text-12 tracking-tight text-white">PackSpace</span>
          </div>
          <h1 className="mt-8 text-28 font-light leading-120 tracking-tight text-white">Welcome back</h1>
          <p className="mt-8 text-16 leading-120 tracking-tight text-white/70">
            Drag an asset onto a contact to <span className="text-white">Send</span> or <span className="text-white">Handoff</span>.
          </p>
        </div>
      )}

      {/* sound + search + view toggles */}
      <div className="fixed top-8 right-8 z-[100] flex items-center gap-8">
        <button type="button" aria-label="Search" onClick={onSearch} className="glass grid size-32 place-items-center rounded-full trans-base hover:bg-white/20">
          <Search className="size-12 text-white" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          data-no-cue
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          aria-pressed={muted}
          onClick={onToggleSound}
          className="glass grid size-32 place-items-center rounded-full trans-base hover:bg-white/20">
          {muted ? <VolumeX className="size-12 text-white/60" strokeWidth={2.5} /> : <Volume2 className="size-12 text-white" strokeWidth={2.5} />}
        </button>
        <div className="glass h-32 flex items-center rounded-full p-4">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.view}
              type="button"
              aria-pressed={view === tab.view}
              onClick={() => onViewChange(tab.view)}
              className={cn(
                "rounded-full px-12 h-24 text-12 leading-120 tracking-tight text-white trans-base",
                view === tab.view ? "bg-white/20" : "hover:bg-white/10"
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
