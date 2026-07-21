"use client"

import { useState } from "react"

import { GradientAvatar } from "@outpacelabs/avatars"

import type { PersonObj } from "@/lib/types"

import { Button } from "../ui/Bits"
import { Window } from "./Window"

// Edit a wallet (contact) object — name, handle, address — or fill in a brand-new one. In create mode
// the contact is only a draft: nothing lands on the desk unless it's saved, so closing the window
// leaves no orphan behind. Object-level only: nothing here verifies an address or touches trust state;
// that's the address-lifecycle flow, out of scope for this pass.

type Props = {
  contact: PersonObj
  /** The contact is a draft that doesn't exist yet — retitle, and save reads as Add. */
  create?: boolean
  z: number
  onClose: () => void
  onSave: (patch: Pick<PersonObj, "label" | "handle" | "address">) => void
}

export function ContactWindow({ contact, create = false, z, onClose, onSave }: Props) {
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
    <Window
      title={create ? "New Contact" : "Edit Wallet"}
      subtitle={contact.label}
      icon={<GradientAvatar seed={contact.address ?? contact.id} size={28} className="shrink-0" />}
      width={440}
      z={z}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-8">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!valid}>
            {create ? "Add" : "Save"}
          </Button>
        </div>
      }>
      <div className="flex flex-col gap-16 p-20">
        <ContactField label="Name" value={label} onChange={setLabel} />
        <ContactField label="Handle" value={handle} onChange={setHandle} />
        <ContactField label="Address" value={address} onChange={setAddress} mono />
      </div>
    </Window>
  )
}

function ContactField({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-6">
      <span className="text-12 font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border border-border bg-surface px-12 py-8 text-13 text-foreground outline-none trans-base focus:border-accent ${mono ? "tnum" : ""}`}
      />
    </label>
  )
}
