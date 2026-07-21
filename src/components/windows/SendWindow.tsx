"use client"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"

// Stub. The full Send machine — amount, Transaction Interpreter, Safety Engine, type-to-confirm, sign —
// is parked verbatim in ./reference/SendWindow.tsx while its design is reworked.
//
// This is a body, not a modal: it renders inside TransferWindow's frame, so choosing Send swaps the
// content of the window that's already up rather than fading a second window in over the first.
// The props are the real ones on purpose: nothing has to change to bring the full machine back.

type Props = {
  asset: AssetObj
  to: PersonObj
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

export function SendWindow(props: Props) {
  void props // stub — the real machine uses all of these
  return (
    <div className="grid h-160 place-items-center">
      <p className="text-14 font-medium text-muted-foreground">Send modal</p>
    </div>
  )
}
