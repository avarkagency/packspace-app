"use client"

import { GradientAvatar } from "@outpacelabs/avatars"

import type { PersonObj } from "@/lib/types"
import { shortAddr } from "@/lib/utils"

import { Button } from "../ui/Bits"
import { Window } from "./Window"

// The trash's second look. Deleting a wallet is permanent — its address book entry, its trust state,
// its place on the desk — so a drop on the trash asks before it acts.

type Props = {
  contact: PersonObj
  z: number
  onClose: () => void
  onConfirm: () => void
}

export function DeleteWindow({ contact, z, onClose, onConfirm }: Props) {
  return (
    <Window
      title="Delete Wallet"
      subtitle={contact.label}
      icon={<GradientAvatar seed={contact.address ?? contact.id} size={28} className="shrink-0" />}
      width={400}
      z={z}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-8">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="border-none bg-danger text-white hover:bg-danger hover:brightness-110"
            onClick={() => {
              onConfirm()
              onClose()
            }}>
            Delete
          </Button>
        </div>
      }>
      <div className="flex flex-col gap-8 p-20">
        <p className="text-13 leading-140">
          Are you sure you want to permanently delete <span className="font-semibold">{contact.label}</span>
          {contact.address ? <span className="tnum text-muted-foreground"> ({shortAddr(contact.address)})</span> : null}?
        </p>
        <p className="text-12 leading-140 text-muted-foreground">This removes the wallet from your desk and can&apos;t be undone.</p>
      </div>
    </Window>
  )
}
