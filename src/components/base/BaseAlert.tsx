"use client"

import { type ReactNode, createElement } from "react"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type BaseAlertVariant = "positive" | "negative" | "warning"

type BaseAlertProps = {
  variant?: BaseAlertVariant
  icon?: LucideIcon
  className?: string
  children: ReactNode
}

const VARIANT: Record<BaseAlertVariant, string> = {
  positive: "border-[#13e192]/20 bg-[#13e192]/20 text-[#13e192]",
  negative: "border-danger/20 bg-danger/20 text-danger",
  warning: "border-warning/20 bg-warning/20 text-warning"
}

export function BaseAlert({ variant = "positive", icon, className = "", children }: BaseAlertProps) {
  return (
    <div className={cn("flex min-h-32 items-center justify-center gap-8 rounded-md border px-12 py-6", VARIANT[variant], className)}>
      {icon && createElement(icon, { className: "size-16 shrink-0" })}
      <p className="text-14 leading-120 tracking-tight opacity-80">{children}</p>
    </div>
  )
}
