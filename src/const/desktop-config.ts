// The desk's stock configuration: the wallpapers on offer, the bento each wallet starts with, and the
// keep-out the floating chrome still needs when the widget bento is off screen.
import type { Wallet } from "@/lib/wallets"
import type { WidgetInstance } from "@/lib/widgets"

/** The wallpaper choices behind "Change Wallpaper ▸" — the design's two gradient images. */
export const WALLPAPERS = [
  { label: "Dusk", css: "#000014 url(/images/bg.png) center / cover no-repeat" },
  { label: "Sea", css: "#000a10 url(/images/bg2.png) center / cover no-repeat" }
] as const

export type Wallpaper = (typeof WALLPAPERS)[number]

/** Each wallet's desk starts with its own copy of the stock bento — same two widgets, separate instances.
 *  From then on they diverge: resizing, reordering or removing a widget on one desk leaves the other's
 *  arrangement exactly as it was. */
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

/** A wallpaper each, so the two halves of the split view are told apart by the desk itself. */
export const initialWallpapers = (): Record<Wallet, Wallpaper> => ({ openfort: WALLPAPERS[0], eoa: WALLPAPERS[1] })

/** The top-right chrome still floating in split view — the search / mute buttons and the view switcher.
 *  Narrower and much shorter than the widget bento's box, but an icon parked under it would still be
 *  unreachable, so the clamp keeps honouring one. */
export const SPLIT_KEEPOUT = { w: 392, h: 48 }
