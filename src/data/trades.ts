import type { TradeRequest } from "@/types/objects"

// Dummy data only — no backend. One request, arriving live on the desk a few seconds into the demo
// (see Desktop.tsx) rather than sitting pre-seeded — the whole point is that it shows up while you're
// there, the way an MMO trade request does.
export const TRADE_REQUESTS: TradeRequest[] = [
  {
    id: "tr-mum",
    fromId: "p-mum",
    fromLabel: "Mum",
    fromHandle: "@mum.base",
    wallet: "openfort"
  }
]
