"use client"

import { type ReactNode, createElement } from "react"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// The modal action button. Primary is solid white (the one thing to press); secondary is the glass
// sibling beside it. `sm` is the compact variant for tight rows. Icons ride left of the label.

type BaseBtnProps = {
  variant?: "primary" | "secondary"
  size?: "md" | "sm"
  icon?: LucideIcon
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function BaseBtn({ variant = "primary", size = "md", icon, className = "", disabled = false, onClick, children }: BaseBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border leading-120 tracking-tight trans-base active:scale-97 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-32 gap-4 px-12 text-12" : "h-40 gap-6 px-16 text-14",
        variant === "primary" ? "border-white/20 bg-white text-black hover:bg-white/90" : "border-white/20 bg-white/10 text-white hover:bg-white/20",
        className
      )}>
      {icon && createElement(icon, { className: cn("shrink-0", size === "sm" ? "size-14" : "size-16") })}
      {children}
    </button>
  )
}
