"use client"

import Image from "next/image"

import type { DesktopObj } from "@/types/objects"

import { artImage } from "@/lib/object-art"

import { ObjectAvatar } from "./ObjectAvatar"
import { ObjectMark } from "./ObjectMark"
import { objectTint } from "./ObjectVisual"

export function ObjectArt({ obj, size = 48 }: { obj: DesktopObj; size?: number }) {
  if (obj.class === "person") return <ObjectAvatar contact={obj} size={size} />

  if (obj.kind === "nft") {
    const art = artImage(obj.symbol)
    if (art)
      return (
        <Image
          src={art}
          alt=""
          width={size}
          height={size}
          unoptimized
          draggable={false}
          style={{ width: size, height: size }}
          className="rounded-4 border-2 border-white object-cover"
        />
      )
    return (
      <span
        className="grid place-items-center rounded-4 border-2 border-white/40"
        style={{ width: size, height: size, background: `${objectTint(obj)}33`, color: objectTint(obj) }}>
        <span className={`font-semibold tracking-tight ${size >= 40 ? "text-12" : "text-10"}`}>{obj.symbol.slice(0, 3)}</span>
      </span>
    )
  }

  return <ObjectMark obj={obj} size={size} />
}
