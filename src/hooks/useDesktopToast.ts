"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { ToastTone } from "@/components/desktop/DesktopToast"

// The desk's transient notice, which gets out of the way on its own. Three tones, and the distinction is
// what the reader can do about it: `error` is a hard impossibility (MetaMask cannot hold a Solana token,
// ever), `alert` is a "not like that" with a way forward, `success` confirms something that happened
// without asking first.

/** How long a notice stays up. Long enough to read a two-line explanation, short enough not to linger. */
const TOAST_MS = 4600

type Toast = { id: number; tone: ToastTone; text: string }

export function useDesktopToast() {
  const idc = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** The id makes each notice its own React instance, so a second one replays the reveal instead of
   *  silently swapping the text inside the panel already on screen. */
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((tone: ToastTone, text: string) => {
    setToast({ id: idc.current++, tone, text })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  // the timer must not fire into an unmounted tree
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { toast, showToast }
}
