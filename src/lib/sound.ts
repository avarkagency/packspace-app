import { useSyncExternalStore } from "react"

import { type SoundName, play, setEnabled } from "cuelume"

const STORAGE_KEY = "packspace:muted"
const GUARD_MS = 40
const PRESS_SELECTOR = "button, a[href], summary, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [data-cue-press]"

let muted = false
let initialized = false
let lastSurfaceCueAt = -Infinity
let lastSparkleAt = -Infinity
const listeners = new Set<() => void>()
const SETTLE_MS = 200
const VOLUME = 4

let audioBoosted = false
function boostAudioOutput() {
  if (audioBoosted || typeof window === "undefined") return
  audioBoosted = true
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const Original = w.AudioContext ?? w.webkitAudioContext
  if (!Original) return

  const Wrapped = function () {
    const ctx = new Original()

    if (w.AudioContext === Wrapped) w.AudioContext = Original
    if (w.webkitAudioContext === Wrapped) w.webkitAudioContext = Original
    try {
      const real = ctx.destination
      const boost = ctx.createGain()
      boost.gain.value = VOLUME

      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -1
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.003
      limiter.release.value = 0.12
      boost.connect(limiter)
      limiter.connect(real)
      Object.defineProperty(ctx, "destination", { get: () => boost, configurable: true })
    } catch {
      // if the override can't be installed, cuelume just plays at its normal level — no harm
    }
    return ctx
  } as unknown as typeof AudioContext
  Wrapped.prototype = Original.prototype

  if (w.AudioContext) w.AudioContext = Wrapped
  if (w.webkitAudioContext) w.webkitAudioContext = Wrapped
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  boostAudioOutput() // in place before cuelume ever builds its AudioContext
  muted = window.localStorage.getItem(STORAGE_KEY) === "1"
  setEnabled(!muted)
}

export function cue(name: SoundName) {
  ensureInit()
  const now = performance.now()
  if (name === "error" && now - lastSparkleAt < SETTLE_MS) return
  if (name === "sparkle") lastSparkleAt = now
  if (name === "bloom" || name === "error" || name === "sparkle") lastSurfaceCueAt = now
  play(name)
}

function isMuted() {
  ensureInit()
  return muted
}

function setMuted(next: boolean) {
  ensureInit()
  if (muted === next) return
  muted = next
  setEnabled(!next)
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  listeners.forEach((l) => l())
}

export function toggleMuted() {
  setMuted(!isMuted())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useMuted() {
  return useSyncExternalStore(
    subscribe,
    () => isMuted(),
    () => false
  )
}

let pressInstalled = false

export function installPressCues() {
  ensureInit()
  if (pressInstalled || typeof document === "undefined") return () => {}
  pressInstalled = true

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null
    const el = target?.closest(PRESS_SELECTOR)
    if (!el || el.closest("[data-no-cue]")) return
    queueMicrotask(() => {
      if (performance.now() - lastSurfaceCueAt < GUARD_MS) return
      play("press")
    })
  }

  document.addEventListener("click", onClick, true)
  return () => {
    document.removeEventListener("click", onClick, true)
    pressInstalled = false
  }
}
