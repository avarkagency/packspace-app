"use client"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"

import { ObjectMark } from "../canvas/ObjectMark"
import { objectTint } from "../canvas/objectVisual"
import { Window } from "./Window"

// Stub. The full Send machine — amount, Transaction Interpreter, Safety Engine, type-to-confirm, sign —
// is parked verbatim in ./reference/SendWindow.tsx while its design is reworked. It wears the new panel
// so the shell is settled before the contents come back.
//
// The props are the real ones on purpose: nothing in the workspace has to change to bring it back, and
// keeping `onSettle` in the signature is what keeps the receipt path honest about where it belongs.

type Props = {
  asset: AssetObj
  to: PersonObj
  z: number
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

export function SendWindow({ asset, to, z, onClose }: Props) {
  return (
    <Window
      title="Send"
      subtitle={`${asset.symbol} → ${to.label}`}
      tint={objectTint(asset)}
      icon={<ObjectMark obj={asset} />}
      width={440}
      z={z}
      cut
      onClose={onClose}
    >
      <div className="grid h-160 place-items-center">
        <p className="text-16 font-bold tracking-[0.08em] text-muted-foreground uppercase">Send Modal</p>
      </div>
    </Window>
  )
}
