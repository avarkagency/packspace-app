"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// The drop-target treatment worn briefly by objects a gesture just produced — both halves of a split, the
// assets a Handoff brought back, a pack's released contents. It lands them next to identical-looking
// neighbours, and nothing else says which ones are new.
//
// An announcement, not a state: it clears itself, and a second flash replaces the first rather than
// queueing behind it. The CSS (`.split-flash`) owns the shape of the fade; this only owns how long the
// ids stay marked.

/** Slightly longer than the CSS animation, so the class is never pulled while it's still running. */
const FLASH_MS = 2100

export function useDesktopFlash() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())

  const flash = useCallback((ids: Iterable<string>) => {
    setFlashIds(new Set(ids))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlashIds(new Set()), FLASH_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { flashIds, flash }
}
