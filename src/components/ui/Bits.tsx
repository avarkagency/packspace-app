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
    "inline-flex shrink-0 items-center justify-center gap-8 rounded-md tracking-[0.08em] uppercase whitespace-nowrap trans-base outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-16 [&_svg]:shrink-0 cursor-pointer"
  const sizes = { sm: "h-28 px-12 text-11", md: "h-36 px-16 text-12" }
  const variants = {
    solid: "bg-accent text-accent-foreground hover:brightness-110 shadow-[0_0_20px_-4px_var(--accent)]",
    outline: "border border-hairline bg-accent-dim/40 text-foreground hover:bg-accent-dim",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-accent-dim/40",
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
    <span
      className={cn(
        "inline-flex items-center gap-4 rounded-sm border px-6 py-2 text-10 font-medium tracking-wide uppercase leading-100",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
