"use client"

import { useEffect, useRef, useState } from "react"

import { setProfilePhoto, useProfilePhoto } from "@/stores/profile"
import { ChevronLeft, ImageUp, Settings, Trash2, ZoomIn, ZoomOut } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cue } from "@/lib/sound"
import { cn } from "@/lib/utils"

import { ME } from "@/data/people"

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_BYTES = 5 * 1024 * 1024
// the avatar and the crop circle share one size, so switching views doesn't jump
const VIEWPORT = 112
const OUTPUT = 256
const MAX_ZOOM = 4
// fits the profile view's text column; both views centre in it so the window never resizes
const BODY_H = 140

type Source = { url: string; w: number; h: number }
type Crop = { zoom: number; x: number; y: number }

type Props = {
  z: number
  onClose: () => void
}

/** Pan is clamped so the image always covers the circle — there is no way to crop in empty space. */
function clampCrop(src: Source, c: Crop): Crop {
  const s = (VIEWPORT / Math.min(src.w, src.h)) * c.zoom
  const maxX = (src.w * s - VIEWPORT) / 2
  const maxY = (src.h * s - VIEWPORT) / 2
  return { zoom: c.zoom, x: Math.max(-maxX, Math.min(maxX, c.x)), y: Math.max(-maxY, Math.min(maxY, c.y)) }
}

export function WindowSettings({ z, onClose }: Props) {
  // refs
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const panRef = useRef<{ x: number; y: number; from: Crop } | null>(null)

  // hooks
  const saved = useProfilePhoto()

  // state
  const [draft, setDraft] = useState(saved)
  const [source, setSource] = useState<Source | null>(null)
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)

  // data
  const me = { id: "me", address: ME.address, photo: draft }
  const dirty = draft !== saved
  const scale = source ? (VIEWPORT / Math.min(source.w, source.h)) * crop.zoom : 1
  const tx = source ? (VIEWPORT - source.w * scale) / 2 + crop.x : 0
  const ty = source ? (VIEWPORT - source.h * scale) / 2 + crop.y : 0

  // events
  const pick = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) return setError("Use a PNG, JPG, WEBP or GIF.")
    if (file.size > MAX_BYTES) return setError("Images must be under 5MB.")

    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      setError(null)
      setCrop({ zoom: 1, x: 0, y: 0 })
      setSource({ url, w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError("Couldn't read that image.")
    }
    img.src = url
  }

  const leaveCrop = () => setSource(null)

  const zoomTo = (zoom: number) => {
    if (!source) return
    setCrop((c) => clampCrop(source, { ...c, zoom: Math.max(1, Math.min(MAX_ZOOM, zoom)) }))
  }

  const save = (photo: string | null) => {
    setProfilePhoto(photo)
    cue("sparkle") // keeps the close that follows from sounding like a cancel
    onClose()
  }

  const saveCrop = () => {
    const img = imgRef.current
    if (!source || !img) return
    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const side = VIEWPORT / scale
    ctx.drawImage(img, -tx / scale, -ty / scale, side, side, 0, 0, OUTPUT, OUTPUT)
    save(canvas.toDataURL("image/jpeg", 0.9))
  }

  const onPanStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { x: e.clientX, y: e.clientY, from: crop }
  }

  const onPanMove = (e: React.PointerEvent) => {
    const pan = panRef.current
    if (!pan || !source) return
    setCrop(clampCrop(source, { ...pan.from, x: pan.from.x + e.clientX - pan.x, y: pan.from.y + e.clientY - pan.y }))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropping(false)
    pick(e.dataTransfer.files[0])
  }

  // effects
  // the object URL lives exactly as long as the crop does — this cleanup is its only revoke
  useEffect(() => {
    if (!source) return
    return () => URL.revokeObjectURL(source.url)
  }, [source])

  return (
    <WindowShell z={z} width={440} onClose={onClose}>
      <div className="p-28">
        <WindowHeading icon={<Settings className="size-20 text-white" />} title={source ? "Crop photo" : "Settings"} />

        <div className="mt-24 flex flex-col justify-center" style={{ height: BODY_H }}>
          {source ? (
            <div className="flex items-center gap-20">
              <div
                onPointerDown={onPanStart}
                onPointerMove={onPanMove}
                onPointerUp={() => (panRef.current = null)}
                onPointerCancel={() => (panRef.current = null)}
                onWheel={(e) => zoomTo(crop.zoom - e.deltaY * 0.002)}
                style={{ width: VIEWPORT, height: VIEWPORT }}
                className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-black/40 ring-1 ring-white/60 select-none active:cursor-grabbing">
                {/* eslint-disable-next-line @next/next/no-img-element -- an object URL being cropped, never a page asset */}
                <img
                  ref={imgRef}
                  src={source.url}
                  alt=""
                  draggable={false}
                  style={{
                    width: source.w,
                    height: source.h,
                    maxWidth: "none",
                    transformOrigin: "0 0",
                    transform: `translate(${tx}px, ${ty}px) scale(${scale})`
                  }}
                  className="absolute top-0 left-0"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-12">
                <div>
                  <p className="text-16 leading-120 tracking-tight text-white">Zoom and placement</p>
                  <p className="mt-4 text-14 leading-140 text-white/60">Drag the photo to move it. Use the slider to zoom.</p>
                </div>
                <div className="flex h-16 items-center gap-8">
                  <ZoomOut className="size-14 shrink-0 text-white/60" />
                  <input
                    type="range"
                    aria-label="Zoom"
                    min={1}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={crop.zoom}
                    onChange={(e) => zoomTo(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                  <ZoomIn className="size-14 shrink-0 text-white/60" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-20">
                <button
                  type="button"
                  aria-label="Upload photo"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropping(true)
                  }}
                  onDragLeave={() => setDropping(false)}
                  onDrop={onDrop}
                  className={cn(
                    "group relative flex shrink-0 cursor-pointer rounded-full ring-1 trans-base active:scale-97",
                    dropping ? "ring-2 ring-white" : "ring-white/40"
                  )}>
                  <ObjectAvatar contact={me} size={VIEWPORT} />
                  <span
                    className={cn(
                      "absolute inset-0 grid place-items-center rounded-full bg-black/50 trans-base",
                      dropping ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                    <ImageUp className="size-24 text-white" />
                  </span>
                </button>

                <div className="flex min-w-0 flex-col gap-12">
                  <div>
                    <p className="text-16 leading-120 tracking-tight text-white">{draft ? "Your photo" : "Generated avatar"}</p>
                    <p className="mt-4 text-14 leading-140 text-white/60">Appears on your Openfort balance and in your contacts&rsquo; lists.</p>
                    <p className={cn("mt-8 text-12 leading-120", error ? "text-danger" : "text-white/40")}>{error ?? "PNG, JPG, WEBP or GIF, up to 5MB."}</p>
                  </div>
                  <div className="flex gap-8">
                    <BaseBtn size="sm" variant="secondary" icon={ImageUp} onClick={() => fileRef.current?.click()}>
                      {draft ? "Replace" : "Upload photo"}
                    </BaseBtn>
                    {draft && (
                      <BaseBtn size="sm" variant="secondary" icon={Trash2} onClick={() => setDraft(null)}>
                        Remove
                      </BaseBtn>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-28 flex gap-8">
          {source ? (
            <>
              <BaseBtn variant="secondary" icon={ChevronLeft} className="flex-1" onClick={leaveCrop}>
                Back
              </BaseBtn>
              <BaseBtn className="flex-1" onClick={saveCrop}>
                Save
              </BaseBtn>
            </>
          ) : (
            <>
              <BaseBtn variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </BaseBtn>
              <BaseBtn className="flex-1" disabled={!dirty} onClick={() => save(draft)}>
                Save
              </BaseBtn>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </div>
    </WindowShell>
  )
}
