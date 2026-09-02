import Image from "next/image"

import { cn } from "@/lib/utils"

import { contactImage } from "./ObjectVisual"

type Props = {
  contact: { id: string; avatarKey?: string }
  size: number
  className?: string
}

export function ObjectAvatar({ contact, size, className }: Props) {
  return (
    <Image
      src={contactImage(contact)}
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
