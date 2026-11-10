import Image from "next/image"

import { GradientAvatar } from "@outpacelabs/avatars"

import { cn } from "@/lib/utils"

import { type AvatarSubject, avatarSeed, contactPhoto } from "./ObjectVisual"

type Props = {
  contact: AvatarSubject
  size: number
  className?: string
}

export function ObjectAvatar({ contact, size, className }: Props) {
  // data
  const photo = contactPhoto(contact)

  if (!photo) return <GradientAvatar seed={avatarSeed(contact)} size={size} className={cn("shrink-0", className)} />

  return (
    <Image
      src={photo}
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
