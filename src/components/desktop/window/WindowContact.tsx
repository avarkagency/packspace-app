"use client"

import { useState } from "react"

import type { PersonObj } from "@/types/objects"
import { Check } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { ObjectAvatar } from "@/components/desktop/object/ObjectAvatar"
import { WindowHeading } from "@/components/desktop/window/WindowHeading"
import { WindowShell } from "@/components/desktop/window/WindowShell"

type Props = {
  contact: PersonObj
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
    <WindowShell z={z} width={440} onClose={onClose}>
      <div className="p-28">
        <WindowHeading mark={<ObjectAvatar contact={contact} size={24} />} title={create ? "New Contact" : "Edit Wallet"} chip={label.trim() || undefined} />

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
    </WindowShell>
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
