"use client"

import Image from "next/image"

import type { AssetObj } from "@/types/objects"

import { artImage } from "@/lib/object-art"

import { ObjectIcon, objectTint } from "./ObjectVisual"

// An object's own mark, for a modal header — the same identity the coin carries on its face, so the panel
// and the thing it's acting on agree.
//
// Real artwork where the symbol has it; the class icon in the object's tint where it doesn't (the stack,
// the packs), rather than a broken image. `unoptimized` for the same reason as the network badges: Next's
// dev image converter drops the connection on the small variants these ask for.

export function ObjectMark({ obj, size = 28 }: { obj: AssetObj; size?: number }) {
  const art = artImage(obj.symbol)
  const tint = objectTint(obj)

  if (art)
    return (
      <Image
        src={art}
        alt=""
        width={size}
        height={size}
        unoptimized
        // never the browser's native image drag — these sit on draggable surfaces
        draggable={false}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      />
    )

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `${tint}1e`, color: tint, border: `1px solid ${tint}44` }}>
      <ObjectIcon obj={obj} className="size-14" />
    </span>
  )
}
