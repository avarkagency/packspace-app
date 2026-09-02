"use client"

import type { PersonObj } from "@/types/objects"
import { Trash2 } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { shortAddr } from "@/lib/utils"

type Props = {
  contact: PersonObj
  z: number
  onClose: () => void
  onConfirm: () => void
}

export function WindowDelete({ contact, z, onClose, onConfirm }: Props) {
  return (
    <WindowShell z={z} width={400} onClose={onClose}>
      <div className="p-28">
        <WindowHeading
          mark={<ObjectAvatar contact={contact} size={24} />}
          title={`Delete ${contact.label}`}
          chip={contact.address ? shortAddr(contact.address) : undefined}
        />

        <p className="mt-24 text-13 leading-140 text-white">
          Are you sure you want to permanently delete <span className="font-semibold">{contact.label}</span>?
        </p>
        <p className="mt-8 text-12 leading-140 text-white/60">This removes the wallet from your desk and can&apos;t be undone.</p>

        <div className="mt-28 flex gap-8">
          <BaseBtn variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </BaseBtn>
          <BaseBtn
            icon={Trash2}
            className="flex-1 border-danger bg-danger text-white hover:bg-danger hover:brightness-110"
            onClick={() => {
              onConfirm()
              onClose()
            }}>
            Delete
          </BaseBtn>
        </div>
      </div>
    </WindowShell>
  )
}
