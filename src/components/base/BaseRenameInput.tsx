"use client"

type Props = {
  value: string
  ariaLabel: string
  className?: string
  onCommit?: (name: string) => void
  onCancel?: () => void
}

/** The in-place rename an icon or a folder wears instead of its label. Enter or blur commits, Escape and
 *  an unchanged name both cancel — the caller never sees a no-op rename. */
export function BaseRenameInput({ value, ariaLabel, className = "", onCommit, onCancel }: Props) {
  // events
  const commit = (el: HTMLInputElement) => {
    const name = el.value.trim()
    if (name && name !== value) onCommit?.(name)
    else onCancel?.()
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(e.currentTarget)
    if (e.key === "Escape") onCancel?.()
  }

  return (
    <input
      defaultValue={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
      onBlur={(e) => commit(e.currentTarget)}
      aria-label={ariaLabel}
      className={`w-full rounded-sm border bg-surface px-4 py-2 text-center text-12 text-foreground outline-none ${className}`}
    />
  )
}
