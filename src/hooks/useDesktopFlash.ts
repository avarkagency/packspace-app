"use client"

import { useCallback, useEffect, useRef, useState } from "react"

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
