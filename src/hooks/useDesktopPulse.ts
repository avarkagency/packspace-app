"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// A fresh pack rings so the eye finds it. One at a time — a second pack takes the ring off the first.

/** Long enough for three beats of the CSS `pack-pulse` keyframes. */
const PULSE_MS = 2400

export function useDesktopPulse() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pulseId, setPulseId] = useState<string | null>(null)

  const pulse = useCallback((id: string) => {
    setPulseId(id)
    if (timer.current) clearTimeout(timer.current)
    // guarded on the id, so a pack that took the ring in the meantime keeps it
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
