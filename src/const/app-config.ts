// Session-level fixtures and thresholds — the constants the desk reads but no fixture set owns.
import type { Chain } from "@/types/objects"

/** The session's network, shown in the top bar. A fixture — nothing here actually connects. */
export const CONNECTED_NETWORK: Chain = "Base"

// Threshold above which a Handoff/Send demands type-to-confirm (spec §3.5.2; value is PS-Q1, open).
export const HIGH_VALUE_USD = 500
