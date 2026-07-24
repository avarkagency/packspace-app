import { useSyncExternalStore } from "react"

import { play, setEnabled, type SoundName } from "cuelume"

// The desktop's sound layer, over cuelume (synthesized Web Audio, no files). Three roles play here:
//   • bloom  — a modal or panel opening
//   • error  — a modal, panel or folder closing
//   • press  — every other button click (wired globally, see installPressCues)
// The app owns the on/off preference; cuelume only applies it. Muting persists across reloads.

const STORAGE_KEY = "packspace:muted"
/** A press that lands within this window of a bloom/error is the same gesture opening/closing a
 *  surface — it would double the sound, so we swallow it. */
const GUARD_MS = 40
/** Selector for "a button" — every interactive element that should knock on click. `[data-cue-press]`
 *  opts an element in explicitly, which is how desktop objects and widgets (plain divs) knock too. */
const PRESS_SELECTOR = "button, a[href], summary, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [data-cue-press]"

let muted = false
let initialized = false
/** The last time a bloom, error or sparkle played — the press guard reads this. */
let lastSurfaceCueAt = -Infinity
/** The last time a transaction sparkled — the window closing on success reads this to stay quiet. */
let lastSparkleAt = -Infinity
const listeners = new Set<() => void>()

/** A settled transaction sparkles, then closes its own window in the same click — within this window
 *  that close's dismissal error is swallowed, so success never sounds like a cancel. */
const SETTLE_MS = 200

/** How much louder than cuelume's own (fairly quiet) levels to play. cuelume exposes no volume control,
 *  so we scale its whole output (see boostAudioOutput). 4 = +12 dB; a limiter after the gain keeps the
 *  louder cues from hard-clipping, so quiet cues get the full lift while peaks stay clean. */
const VOLUME = 4

/** cuelume wires every sound straight to its shared AudioContext's `destination`, with no master
 *  volume of its own. To make everything louder we splice a gain node in front of that destination:
 *  wrap the AudioContext constructor just long enough for cuelume to create its single shared context,
 *  give that context a `destination` that routes through our gain, then restore the constructor so no
 *  other audio is affected. Must run before cuelume's first play() creates the context — ensureInit
 *  (called on mount, ahead of any cue) guarantees that. */
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

/** Read the stored preference once, on the client, and hand it to cuelume. Every entry point calls
 *  this first, so the very first cue already respects a saved mute. A no-op on the server. */
function ensureInit() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  boostAudioOutput() // in place before cuelume ever builds its AudioContext
  muted = window.localStorage.getItem(STORAGE_KEY) === "1"
  setEnabled(!muted)
}

/** Play a cue. Bloom, error and sparkle stamp the press guard so the click that triggered them doesn't
 *  also knock. A transaction's sparkle also swallows the error from the same click's window close.
 *  cuelume no-ops the play itself while muted. */
export function cue(name: SoundName) {
  ensureInit()
  const now = performance.now()
  if (name === "error" && now - lastSparkleAt < SETTLE_MS) return // success just sparkled — no dismissal error
  if (name === "sparkle") lastSparkleAt = now
  if (name === "bloom" || name === "error" || name === "sparkle") lastSurfaceCueAt = now
  play(name)
}

export function isMuted() {
  ensureInit()
  return muted
}

export function setMuted(next: boolean) {
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

/** The mute flag as React state. Server snapshot is always "on", and useSyncExternalStore reconciles
 *  to the stored value on the client without a hydration warning. */
export function useMuted() {
  return useSyncExternalStore(
    subscribe,
    () => isMuted(),
    () => false
  )
}

let pressInstalled = false

/** Wire "press on every button" once, for the whole document. Capture phase so a component's own
 *  stopPropagation can't hide the click; the play is deferred to a microtask so any bloom/error the
 *  click's own handler fires (opening or closing a surface) has already stamped the guard by the time
 *  we check it — an open/close never doubles into a press. Returns a cleanup for the mount effect. */
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
