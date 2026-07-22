"use client"

import type { AssetObj, PersonObj, Receipt } from "@/lib/types"

// Stub. The full Handoff machine — the §3.5.2 lock → review → confirm → all-or-nothing launch, with the
// counterparty and the self-writing summary — is parked verbatim in ./reference/HandoffWindow.tsx while
// its design is reworked. "Trade" is what the user reads; the internals stay `handoff`.
//
// This is a body, not a modal: it renders inside TransferWindow's frame, so choosing Trade swaps the
// content of the window that's already up rather than fading a second window in over the first.
// The props are the real ones on purpose: nothing has to change to bring the full machine back.

type Props = {
  /** Everything the drop carried — the trade opens seeded with all of it. */
  seeds: AssetObj[]
  to: PersonObj
  onClose: () => void
  onSettle: (r: Receipt) => void
  onLog: (m: string) => void
}

export function HandoffWindow(props: Props) {
  void props // stub — the real machine uses all of these
  return (
    <div className="grid h-160 place-items-center">
      <p className="text-14 font-medium text-muted-foreground">Trade modal</p>
    </div>
  )
}
