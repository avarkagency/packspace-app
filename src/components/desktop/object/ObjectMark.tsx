"use client"

import Image from "next/image"

import type { AssetObj } from "@/types/objects"

import { artImage } from "@/lib/object-art"

import { ObjectIcon, objectTint } from "./ObjectVisual"

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
