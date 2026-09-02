"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Marks what a gesture just produced, which lands next to identical-looking neighbours. An announcement,
// not a state: it clears itself, and a second flash replaces the first rather than queueing behind it.

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
