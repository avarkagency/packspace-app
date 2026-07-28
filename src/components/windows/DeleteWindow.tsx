"use client"

import { Trash2, X } from "lucide-react"

import type { PersonObj } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { BaseBtn } from "../base/BaseBtn"
import { ContactAvatar } from "../shell/ContactAvatar"

// The trash's second look. Deleting a wallet is permanent — its address book entry, its trust state,
// its place on the desk — so a drop on the trash asks before it acts. Wears the shared glass frame.

type Props = {
  contact: PersonObj
  z: number
  onClose: () => void
  onConfirm: () => void
}

export function DeleteWindow({ contact, z, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 grid place-items-center p-24" style={{ zIndex: z }}>
      <div className="animate-in fade-in-0 absolute inset-0 bg-black/20 backdrop-blur-xl duration-200" onClick={onClose} aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute top-28 right-28 grid size-40 cursor-pointer place-items-center rounded-12 text-white trans-base hover:bg-white/20 active:scale-97">
        <X className="size-16" />
      </button>

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 400 }}>
        <div className="p-28">
          <h2 className="flex items-center gap-8 text-18 leading-120 tracking-tight text-white">
            <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">
              <ContactAvatar contact={contact} size={24} />
            </span>
            Delete {contact.label}
          </h2>
          {contact.address && (
            <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{shortAddr(contact.address)}</span>
          )}

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

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
      </div>
    </div>
  )
}
