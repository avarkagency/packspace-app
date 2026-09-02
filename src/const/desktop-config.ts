import type { Wallet } from "@/lib/wallets"
import type { WidgetInstance } from "@/lib/widgets"

export const WALLPAPERS = [
  { label: "Dusk", css: "#000014 url(/images/bg.png) center / cover no-repeat" },
  { label: "Sea", css: "#000a10 url(/images/bg2.png) center / cover no-repeat" }
] as const

export type Wallpaper = (typeof WALLPAPERS)[number]

/** Separate instances per wallet, so the two desks' arrangements diverge from here. */
export const initialWidgets = (): Record<Wallet, WidgetInstance[]> => ({
  openfort: [
    { id: "w-openfort-balance", type: "balance", span: 2 },
    { id: "w-openfort-nft", type: "nft", span: 2 }
  ],
  eoa: [
    { id: "w-eoa-balance", type: "balance", span: 2 },
    { id: "w-eoa-nft", type: "nft", span: 2 }
  ]
})

/** One each, so the split view's halves are told apart by the desk rather than a tint over it. */
export const initialWallpapers = (): Record<Wallet, Wallpaper> => ({ openfort: WALLPAPERS[0], eoa: WALLPAPERS[1] })

/** Split view draws no bento, but the search / mute / view chrome still floats — so the clamp still
 *  needs a keep-out or an icon could park under it, unreachable. */
export const SPLIT_KEEPOUT = { w: 392, h: 48 }
