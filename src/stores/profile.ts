import { useSyncExternalStore } from "react"

const STORAGE_KEY = "packspace:pfp"

const listeners = new Set<() => void>()
let photo: string | null = null
let loaded = false

function readPhoto() {
  if (loaded || typeof window === "undefined") return photo
  loaded = true
  try {
    photo = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    photo = null
  }
  return photo
}

export function setProfilePhoto(next: string | null) {
  photo = next
  loaded = true
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage full or blocked — the photo still holds for this session
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useProfilePhoto() {
  return useSyncExternalStore(subscribe, readPhoto, () => null)
}
