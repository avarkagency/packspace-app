import { useSyncExternalStore } from "react"

import { type SoundName, play, setEnabled } from "cuelume"

// Over cuelume (synthesized Web Audio, no files). bloom = a surface opening, error = one closing,
// press = every other button click. The app owns the mute preference; cuelume only applies it.

const STORAGE_KEY = "packspace:muted"
/** A press that lands within this window of a bloom/error is the same gesture opening/closing a
 *  surface — it would double the sound, so we swallow it. */
const GUARD_MS = 40
/** `[data-cue-press]` opts an element in explicitly — that's how plain divs knock too. */
const PRESS_SELECTOR = "button, a[href], summary, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [data-cue-press]"

let muted = false
let initialized = false
/** Read by the press guard. */
let lastSurfaceCueAt = -Infinity
/** Read by a window closing on success, to stay quiet. */
let lastSparkleAt = -Infinity
const listeners = new Set<() => void>()

/** A settled transaction sparkles, then closes its own window in the same click — within this window
 *  that close's dismissal error is swallowed, so success never sounds like a cancel. */
const SETTLE_MS = 200

/** cuelume exposes no volume control, so its whole output is scaled (see boostAudioOutput). 4 = +12 dB. */
const VOLUME = 4

/** cuelume has no master volume, so a gain node is spliced in front of its destination: wrap the
 *  AudioContext constructor just long enough for cuelume to create its one shared context, then restore
 *  it so no other audio is affected. MUST run before cuelume's first play() creates that context —
 *  ensureInit, called on mount ahead of any cue, guarantees it. */
let audioBoosted = false
function boostAudioOutput() {
  if (audioBoosted || typeof window === "undefined") return
  audioBoosted = true
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const Original = w.AudioContext ?? w.webkitAudioContext
  if (!Original) return

  const Wrapped = function () {
    const ctx = new Original()
    // we only need to catch cuelume's one shared context — undo the global wrap right away
    if (w.AudioContext === Wrapped) w.AudioContext = Original
    if (w.webkitAudioContext === Wrapped) w.webkitAudioContext = Original
    try {
      const real = ctx.destination
      const boost = ctx.createGain()
      boost.gain.value = VOLUME
      // a brickwall-ish limiter after the gain — lets us push the level hard without the louder cues
      // clipping: anything under the ceiling passes at full VOLUME, peaks above it are caught cleanly
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

/** Every entry point calls this first, so the very first cue already respects a saved mute. */
function ensureInit() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  boostAudioOutput() // in place before cuelume ever builds its AudioContext
  muted = window.localStorage.getItem(STORAGE_KEY) === "1"
  setEnabled(!muted)
}

/** Bloom, error and sparkle stamp the press guard, so the click that triggered them doesn't also knock;
 *  a sparkle additionally swallows the error from the same click's window close. */
export function cue(name: SoundName) {
  ensureInit()
  const now = performance.now()
  if (name === "error" && now - lastSparkleAt < SETTLE_MS) return // success just sparkled — no dismissal error
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

/** Server snapshot is always "on", reconciled on the client without a hydration warning. */
export function useMuted() {
  return useSyncExternalStore(
    subscribe,
    () => isMuted(),
    () => false
  )
}

let pressInstalled = false

/** Capture phase, so a component's own stopPropagation can't hide the click. The play is deferred to a
 *  microtask so any bloom/error that click's handler fires has already stamped the guard — an open or
 *  close never doubles into a press. */
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
