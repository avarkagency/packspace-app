"use client"

import { useState } from "react"

import type { PersonObj } from "@/types/objects"
import { Check, X } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"

// Edit a wallet (contact) object — name, handle, address — or fill in a brand-new one. In create mode
// the contact is only a draft: nothing lands on the desk unless it's saved, so closing the window
// leaves no orphan behind. Object-level only: nothing here verifies an address or touches trust state;
// that's the address-lifecycle flow, out of scope for this pass. Wears the shared glass frame.

type Props = {
  contact: PersonObj
  /** The contact is a draft that doesn't exist yet — retitle, and save reads as Add. */
  create?: boolean
  z: number
  onClose: () => void
  onSave: (patch: Pick<PersonObj, "label" | "handle" | "address">) => void
}

export function WindowContact({ contact, create = false, z, onClose, onSave }: Props) {
  // state
  const [label, setLabel] = useState(contact.label)
  const [handle, setHandle] = useState(contact.handle)
  const [address, setAddress] = useState(contact.address ?? "")

  // data
  const valid = label.trim().length > 0

  // events
  const onConfirm = () => {
    if (!valid) return
    onSave({
      label: label.trim(),
      handle: handle.trim(),
      address: address.trim() || undefined
    })
    onClose()
  }

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

      <div className="glass panel-in relative overflow-hidden rounded-16" style={{ width: 440 }}>
        <div className="p-28">
          <h2 className="flex items-center gap-8 text-18 leading-120 tracking-tight text-white">
            <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">
              <ObjectAvatar contact={contact} size={24} />
            </span>
            {create ? "New Contact" : "Edit Wallet"}
          </h2>
          {label.trim() && <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{label.trim()}</span>}

          <div className="-mx-28 mt-24 h-px bg-white/20" aria-hidden />

          <div className="mt-24 flex flex-col gap-16">
            <ContactField label="Name" value={label} onChange={setLabel} />
            <ContactField label="Handle" value={handle} onChange={setHandle} />
            <ContactField label="Address" value={address} onChange={setAddress} mono />
          </div>

          <div className="mt-28 flex gap-8">
            <BaseBtn variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </BaseBtn>
            <BaseBtn icon={Check} className="flex-1" disabled={!valid} onClick={onConfirm}>
              {create ? "Add" : "Save"}
            </BaseBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactField({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-6">
      <span className="text-12 font-medium text-white/60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border border-white/10 bg-white/5 px-12 py-8 text-13 text-white outline-none trans-base placeholder:text-white/40 focus:border-white/30 ${mono ? "tnum" : ""}`}
      />
    </label>
  )
}
