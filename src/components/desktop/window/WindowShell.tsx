"use client"

import type { CSSProperties, ReactNode } from "react"

import { X } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  z: number
  width: number
  behind?: ReactNode
  cardClassName?: string
  cardStyle?: CSSProperties
  children: ReactNode
  onClose: () => void
}

export function WindowShell({ z, width, onClose, behind, cardClassName, cardStyle, children }: Props) {
  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: z }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      {behind}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className={cn("glass panel-in relative overflow-hidden rounded-16", cardClassName)} style={{ width, ...cardStyle }}>
        {children}
      </div>
    </div>
  )
}
