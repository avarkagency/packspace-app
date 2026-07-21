import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

// Small hand-rolled UI atoms — kept dependency-light so the prototype installs clean.

export function Button({
  className,
  variant = "solid",
  size = "md",
  ...props
}: ComponentProps<"button"> & { variant?: "solid" | "outline" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const base =
    "inline-flex shrink-0 items-center justify-center gap-8 rounded-lg font-medium whitespace-nowrap trans-base outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-16 [&_svg]:shrink-0 cursor-pointer"
  const sizes = { sm: "h-28 px-10 text-12", md: "h-36 px-14 text-13" }
  const variants = {
    solid: "bg-accent text-accent-foreground hover:brightness-105",
    outline: "border border-border bg-surface text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    danger: "border border-danger/40 text-danger hover:bg-danger/10"
  }
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
}

export function Badge({
  className,
  tone = "muted",
  children
}: {
  className?: string
  tone?: "muted" | "accent" | "success" | "warning" | "danger" | "violet"
  children: ReactNode
}) {
  const tones = {
    muted: "border-border text-muted-foreground",
    accent: "border-accent/40 text-accent",
    success: "border-success/40 text-success",
    warning: "border-warning/40 text-warning",
    danger: "border-danger/40 text-danger",
    violet: "border-violet/40 text-violet"
  }
  return (
    <span className={cn("inline-flex items-center gap-4 rounded-md border px-6 py-2 text-11 font-medium leading-120", tones[tone], className)}>{children}</span>
  )
}
