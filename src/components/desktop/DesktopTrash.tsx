"use client"

import { Trash2 } from "lucide-react"

import { TRASH_DROP_KEY } from "@/lib/asset-ops"
import { cn } from "@/lib/utils"

// The desk's trash can, bottom right. A drop target for wallets only — drag a contact onto it to
// delete them (assets are money; they don't belong in a bin). It carries its drop key only while a
// wallet is actually in hand, so an asset flung into the corner just lands there.

export function DesktopTrash({ armed, over }: { armed: boolean; over: boolean }) {
  return (
    <div
      data-drop={armed ? TRASH_DROP_KEY : undefined}
      className={cn(
        "fixed right-16 bottom-16 flex w-96 flex-col items-center gap-8 rounded-lg p-10 trans-base select-none",
        over && "bg-danger/15 ring-1 ring-danger"
      )}>
      <Trash2 strokeWidth={1.5} className={cn("size-32 trans-base", over ? "text-danger" : armed ? "text-foreground/80" : "text-foreground/30")} />
      <p className={cn("text-12 font-medium trans-base", over ? "text-danger" : armed ? "text-foreground/70" : "text-foreground/30")}>
        {over ? "Delete" : "Trash"}
      </p>
    </div>
  )
}
