import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type BaseBadgeTone = "muted" | "accent" | "success" | "warning" | "danger" | "violet"

type BaseBadgeProps = {
  tone?: BaseBadgeTone
  className?: string
  children: ReactNode
}

const TONES: Record<BaseBadgeTone, string> = {
  muted: "border-border text-muted-foreground",
  accent: "border-accent/40 text-accent",
  success: "border-success/40 text-success",
  warning: "border-warning/40 text-warning",
  danger: "border-danger/40 text-danger",
  violet: "border-violet/40 text-violet"
}

export function BaseBadge({ tone = "muted", className = "", children }: BaseBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-4 rounded-md border px-6 py-2 text-11 leading-120 font-medium", TONES[tone], className)}>{children}</span>
  )
}
