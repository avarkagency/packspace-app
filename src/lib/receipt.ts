import type { Receipt } from "@/types/objects"

import { fakeHash } from "./utils"

type Draft = Omit<Receipt, "id" | "hash" | "status" | "at"> & { seed: string }

/** Every settlement mints its receipt the same way — the id off the action and the clock, the hash off a
 *  seed describing what moved, and the wall time in one format. Only the facts differ. */
export function makeReceipt({ seed, ...rest }: Draft): Receipt {
  return {
    ...rest,
    id: `rcpt-${rest.action.toLowerCase()}-${Date.now()}`,
    hash: fakeHash(seed),
    status: "Settled",
    at: new Date().toLocaleTimeString("en-US", { hour12: false })
  }
}
