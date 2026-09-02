"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { ToastTone } from "@/components/desktop/DesktopToast"

const TOAST_MS = 4600

type Toast = { id: number; tone: ToastTone; text: string }

export function useDesktopToast() {
  // refs
  const idc = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // state
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
