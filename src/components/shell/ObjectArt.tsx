"use client"

import Image from "next/image"

import type { DesktopObj } from "@/types/objects"

import { ObjectMark } from "@/components/canvas/ObjectMark"
import { objectTint } from "@/components/canvas/ObjectVisual"
import { artImage } from "@/components/canvas/object-art"

import { ContactAvatar } from "./ContactAvatar"

// The flat DOM twin of an object's 3D art — borderless round coin art for tokens, a 2px-bordered rounded
// square for NFTs (their desk shape), the gradient avatar for contacts. NFTs without shipped art draw a
// tinted monogram square, the flat cousin of the face their 3D card draws for itself.
//
// Used wherever the WebGL overlay doesn't reach: the folder window's tiles, and the desktop detail card
// (which stacks above the flying canvas while it's in hand, so a real coin would end up behind its glass).

export function ObjectArt({ obj, size = 48 }: { obj: DesktopObj; size?: number }) {
  if (obj.class === "person") return <ContactAvatar contact={obj} size={size} />

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
