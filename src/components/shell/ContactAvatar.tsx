import Image from "next/image"

import { cn } from "@/lib/utils"

import { contactImage } from "../canvas/objectVisual"

// A contact's avatar as the desk's 3D coin wears it — the shipped photo, or the shared default face for a
// bare address. Drawn from the same source as the canvas coin (`contactImage`), so a contact reads
// identically in a window and on the desk. `unoptimized` for the same reason the coin marks are: Next's
// dev image pipeline drops the connection on the tiny variants it would request.

export function ContactAvatar({ id, size, className }: { id: string; size: number; className?: string }) {
  return (
    <Image
      src={contactImage(id)}
      alt=""
      width={size}
      height={size}
      unoptimized
      draggable={false}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  )
}
