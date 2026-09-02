"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const PULSE_MS = 2400

export function useDesktopPulse() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pulseId, setPulseId] = useState<string | null>(null)

  const pulse = useCallback((id: string) => {
    setPulseId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPulseId((cur) => (cur === id ? null : cur)), PULSE_MS)
  }, [])

  const clearPulse = useCallback(() => setPulseId(null), [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { pulseId, pulse, clearPulse }
}
