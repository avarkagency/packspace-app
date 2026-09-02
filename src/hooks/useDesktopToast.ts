"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { ToastTone } from "@/components/desktop/DesktopToast"

// The tone is what the reader can do about it: `error` is a hard impossibility, `alert` is a "not like
// that" with a way forward, `success` confirms something that already happened.

const TOAST_MS = 4600

type Toast = { id: number; tone: ToastTone; text: string }

export function useDesktopToast() {
  const idc = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** The id makes each notice its own React instance, so a second replays the reveal rather than
   *  silently swapping the text inside the panel already on screen. */
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((tone: ToastTone, text: string) => {
    setToast({ id: idc.current++, tone, text })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { toast, showToast }
}
