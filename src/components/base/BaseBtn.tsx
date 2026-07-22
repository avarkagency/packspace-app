"use client"

import { type ReactNode, createElement } from "react"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// The modal action button. Primary is solid white (the one thing to press); secondary is the glass
// sibling beside it. Icons are optional and always 16px, riding left of the label.

type BaseBtnProps = {
  variant?: "primary" | "secondary"
  icon?: LucideIcon
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function BaseBtn({ variant = "primary", icon, className = "", disabled = false, onClick, children }: BaseBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-40 cursor-pointer items-center justify-center gap-6 rounded-full border px-16 text-14 leading-120 tracking-tight trans-base active:scale-97 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" ? "border-white/20 bg-white text-black hover:bg-white/90" : "border-white/20 bg-white/10 text-white hover:bg-white/20",
        className
      )}>
      {icon && createElement(icon, { className: "size-16 shrink-0" })}
      {children}
    </button>
  )
}
