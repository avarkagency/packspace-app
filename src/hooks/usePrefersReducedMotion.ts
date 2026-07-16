"use client"

import { useSyncExternalStore } from "react"

// The CSS side of reduced-motion is handled globally in globals.css, but canvas animation runs in a
// frame loop that no media query can reach — the coins have to ask directly. matchMedia is an external
// store, so it subscribes as one rather than mirroring into state via an effect.

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches
const getServerSnapshot = () => false

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
