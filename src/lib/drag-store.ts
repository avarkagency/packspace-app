"use client"

import { useSyncExternalStore } from "react"

import type { AssetObj } from "./types"

// Shared drag state kept outside React (strict React Compiler lint: no mutating hook state in render).
// Tracks which asset is being dragged and which drop zone the pointer is currently over. The ghost's
// pixel position is moved imperatively in the pointer handler, never through this store.

type DragState = { asset: AssetObj | null; over: string | null }

let state: DragState = { asset: null, over: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function startDrag(asset: AssetObj) {
  state = { asset, over: null }
  emit()
}
export function setOver(over: string | null) {
  if (state.over === over) return
  state = { ...state, over }
  emit()
}
export function endDrag() {
  if (!state.asset && !state.over) return
  state = { asset: null, over: null }
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
