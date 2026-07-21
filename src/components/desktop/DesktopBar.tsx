"use client"

import { GradientAvatar } from "@outpacelabs/avatars"

import { CONNECTED_NETWORK, WALLET } from "@/lib/data"
import { shortAddr, usd } from "@/lib/utils"

// The thin OS bar across the top of the desktop: identity on the left, session truth on the right —
// connected network, total balance, connected wallet. Display-only in this prototype.

/** The bar's height, so the workspace can lay the desktop out below it. */
export const BAR_H = 36

export function DesktopBar({ totalUsd }: { totalUsd: number }) {
  return (
    <header
      style={{ height: BAR_H }}
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b border-border bg-surface/80 px-12 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <span className="grid size-18 place-items-center rounded-sm bg-foreground text-11 font-bold text-background">P</span>
        <span className="text-13 font-semibold">PackSpace</span>
      </div>

      <div className="flex items-center gap-16 text-12">
        <span className="flex items-center gap-6 text-muted-foreground">
          <span className="size-6 rounded-full bg-success" aria-hidden />
          {CONNECTED_NETWORK}
        </span>
        <span className="tnum font-semibold">{usd(totalUsd, { cents: false })}</span>
        <span className="flex items-center gap-8">
          <GradientAvatar seed={WALLET.address} size={20} className="shrink-0" />
          <span className="font-medium">{WALLET.label}</span>
          <span className="tnum text-muted-foreground">{shortAddr(WALLET.address)}</span>
        </span>
      </div>
    </header>
  )
}
