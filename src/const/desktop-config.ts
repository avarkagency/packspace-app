import type { Wallet } from "@/lib/wallets"
import type { WidgetInstance } from "@/lib/widgets"

export const WALLPAPERS = [
  { label: "Dusk", css: "#000014 url(/images/bg.png) center / cover no-repeat" },
  { label: "Sea", css: "#000a10 url(/images/bg2.png) center / cover no-repeat" }
] as const

export type Wallpaper = (typeof WALLPAPERS)[number]

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

export const initialWallpapers = (): Record<Wallet, Wallpaper> => ({ openfort: WALLPAPERS[0], eoa: WALLPAPERS[1] })

export const SPLIT_KEEPOUT = { w: 392, h: 48 }
