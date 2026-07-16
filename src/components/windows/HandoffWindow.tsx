"use client"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { Window } from "./Window"

// Stub. The full Handoff machine — the §3.5.2 lock → review → confirm → all-or-nothing launch, with the
// counterparty and the self-writing summary — is parked verbatim in ./reference/HandoffWindow.tsx while
// its design is reworked. "Trade" is what the user reads; the internals stay `handoff`.
//
// The props are the real ones on purpose: nothing in the workspace has to change to bring it back.

type Props = {
  seed: AssetObj
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

export function HandoffWindow({ seed, to, z, onClose }: Props) {
  return (
    <Window
      title="Trade"
      subtitle={`${seed.symbol} ⇄ ${to.label}`}
      tint={objectTint(seed)}
      icon={<ObjectMark obj={seed} />}
      width={440}
      z={z}
      cut
      onClose={onClose}
    >
      <div className="grid h-160 place-items-center">
        <p className="text-16 font-bold tracking-[0.08em] text-muted-foreground uppercase">Trade Modal</p>
      </div>
    </Window>
  )
}
