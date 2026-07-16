"use client"

import { GradientAvatar } from "@outpacelabs/avatars"

import { useDrag } from "@/lib/drag-store"
import type { AssetObj, PersonObj } from "@/lib/types"
import { cn, shortAddr } from "@/lib/utils"

import { ActionZone } from "./ActionZone"

// The permanent right rail — a list of people, nothing else. Each contact's Send / Trade zones stay
// collapsed to nothing and slide open only when there's a coin to act on, so at rest it's just the list.
//
// Zones open on a drag, and also on a selection — otherwise clicking a coin would leave them with no way
// to reach it, and they double as buttons for the selected asset (spec §3.5.4).
//
// Split isn't here: it needs no counterparty, so it lives on the grid's own dock.

export function ContactsPanel({
  asset,
  contacts,
  onSend,
  onHandoff
}: {
  asset: AssetObj | null
  contacts: PersonObj[]
  onSend: (to: PersonObj) => void
  onHandoff: (to: PersonObj) => void
}) {
  const { asset: dragging } = useDrag()

  return (
    <aside className="flex w-400 shrink-0 flex-col border-l border-border bg-surface/40 backdrop-blur-md xl:w-340">
      <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto p-12">
        {contacts.map((c) => (
          <ContactRow key={c.id} contact={c} live={!!asset} armed={!!dragging} onSend={() => onSend(c)} onTrade={() => onHandoff(c)} />
        ))}

        {/* the address-lifecycle flow (add → confirm → block) isn't in this pass — this is the slot it
            lands in, so the rail's shape is right when it does. Neutral and faded back: it's the one
            action here that isn't about an object, so it carries no signal and doesn't compete. */}
        <ActionZone label="New contact" tone="neutral" className="shrink-0 opacity-50 trans-base hover:opacity-100" />
      </div>
    </aside>
  )
}

function ContactRow({
  contact,
  live,
  armed,
  onSend,
  onTrade
}: {
  contact: PersonObj
  live: boolean
  armed: boolean
  onSend: () => void
  onTrade: () => void
}) {
  const { over } = useDrag()
  const open = live || armed

  return (
    <div className="fui-glass flex shrink-0 flex-col p-12">
      <div className="flex items-center gap-10">
        {/* the address seeds the gradient, so a contact's avatar *is* their address — two people can't
            collide, and it changes if the address does */}
        <GradientAvatar seed={contact.address ?? contact.id} size={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-12 tracking-[0.08em] uppercase leading-120">{contact.label}</p>
          <p className="tnum truncate text-11 text-muted-foreground">{contact.handle}</p>
          {contact.address && <p className="tnum truncate text-11 text-muted-foreground/60">{shortAddr(contact.address)}</p>}
        </div>
      </div>

      {/* drop zones — collapsed to nothing until a coin is in hand. Height is animated rather than
          transformed because the row genuinely has to take up no space when closed. */}
      <div
        className={cn(
          "grid grid-cols-2 gap-8 overflow-hidden transition-[height,margin] duration-200 ease-[var(--ease-out-quart)]",
          open ? "mt-12 h-56" : "mt-0 h-0"
        )}
      >
        <ActionZone
          dropKey={`${contact.id}:send`}
          label="Send"
          tone="send"
          live={live}
          isOver={over === `${contact.id}:send`}
          focusable={open}
          onClick={onSend}
        />
        <ActionZone
          dropKey={`${contact.id}:handoff`}
          label="Trade"
          tone="trade"
          live={live}
          isOver={over === `${contact.id}:handoff`}
          focusable={open}
          onClick={onTrade}
        />
      </div>
    </div>
  )
}
