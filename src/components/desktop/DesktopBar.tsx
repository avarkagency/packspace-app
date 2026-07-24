"use client"

import { useState } from "react"

import { Search, Volume2, VolumeX } from "lucide-react"

import { cue, toggleMuted, useMuted } from "@/lib/sound"
import { cn } from "@/lib/utils"

// The desktop's top chrome. No longer a solid OS bar: the wallpaper runs to the top edge and the
// chrome floats on it — identity and greeting on the left, the wallet/view toggles on the right. The
// balance card that used to sit here is now the Balance widget in the top-right WidgetGrid, which owns
// the desk's top-right keep-out box (see lib/chrome-keepout). The toggles are design-only for now.

/** The view tabs — exactly one is ever active. */
const VIEW_TABS = ["Openfort", "MetaMask", "Split View"]

export function DesktopBar({ onSearch }: { onSearch: () => void }) {
  // state — the view segmented control is display-only (split view / MetaMask are out of scope)
  const [active, setActive] = useState("Openfort")

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
          an object dragged across the corner flies over the words like paper over a desk blotter. */}
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
          {VIEW_TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActive(name)}
              className={cn(
                "rounded-full px-12 h-24 text-12 leading-120 tracking-tight text-white trans-base",
                active === name ? "bg-white/20" : "hover:bg-white/10"
              )}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
