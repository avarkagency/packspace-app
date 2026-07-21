"use client"

import { useSyncExternalStore } from "react"

import type { DesktopObj } from "./types"

// Shared drag state kept outside React (strict React Compiler lint: no mutating hook state in render).
// Tracks which desktop object is being dragged and which drop zone the pointer is currently over. The
// ghost's pixel position is moved imperatively in the pointer handler, never through this store.

type DragState = { obj: DesktopObj | null; over: string | null }

let state: DragState = { obj: null, over: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function startDrag(obj: DesktopObj) {
  state = { obj, over: null }
  emit()
}
export function setOver(over: string | null) {
  if (state.over === over) return
  state = { ...state, over }
  emit()
}
export function endDrag() {
  if (!state.obj && !state.over) return
  state = { obj: null, over: null }
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => state

export function useDrag() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
