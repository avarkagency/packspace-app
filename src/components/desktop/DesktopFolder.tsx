"use client"

import Image from "next/image"

import { ICON_W } from "./DesktopIcon"

// A desk folder — Other Tokens holds the long tail of dust balances, and the desk menu can mint empty
// ones to organise into. Design-only for now: opening, taking drops and giving tokens back come with
// the folder features. It wears the same anatomy as every desktop icon (art, label, pill) so it reads
// as a native object, but the art is a flat image rather than a scene-drawn coin — a folder is
// furniture, not currency.

export function DesktopFolder({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ width: ICON_W, padding: 8 }} className="flex flex-col items-center gap-8 select-none">
      <div className="grid h-48 shrink-0 place-items-center">
        <Image src="/images/folder.png" alt={`${label} folder`} width={63} height={49} unoptimized className="h-48 w-auto" />
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <p className="w-full truncate text-center text-12 font-medium leading-120 tracking-tight text-white">{label}</p>
        <span className="tnum rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  )
}
