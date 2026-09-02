"use client"

import { useSyncExternalStore } from "react"

import type { DesktopObj } from "@/types/objects"

// Shared drag state kept outside React (strict React Compiler lint: no mutating hook state in render).
// Tracks what's in hand — one object, or a carried multi-selection — and which drop zone the pointer
// is currently over. A group carry IS a drag as far as every consumer is concerned: the scene lifts
// and unclips carried coins, resting objects go inert, the hover readout stands down. The pixel
// positions are moved imperatively in the pointer handlers, never through this store.

type DragState = { obj: DesktopObj | null; carriedIds: ReadonlySet<string> | null; over: string | null }

let state: DragState = { obj: null, carriedIds: null, over: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function startDrag(obj: DesktopObj) {
  state = { obj, carriedIds: null, over: null }
  emit()
}
export function startGroupDrag(ids: ReadonlySet<string>) {
  state = { obj: null, carriedIds: ids, over: null }
  emit()
}
export function setOver(over: string | null) {
  if (state.over === over) return
  state = { ...state, over }
  emit()
}
export function endDrag() {
  if (!state.obj && !state.carriedIds && !state.over) return
  state = { obj: null, carriedIds: null, over: null }
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
