import type { PackObj } from "@/types/objects"

export const PACKS: PackObj[] = [
  {
    id: "k-chase",
    class: "pack",
    label: "Chase Pack",
    packClass: "product",
    contents: "3 graded slabs",
    sealed: true,
    usd: 640,
    color: "#22d3ee",
    chain: "Base"
  },
  {
    id: "k-grail",
    class: "pack",
    label: "Grail Box",
    packClass: "randomized",
    contents: "1 chance reveal",
    sealed: true,
    usd: 120,
    color: "#f472b6",
    chain: "Base"
  },
  {
    id: "k-gift",
    class: "pack",
    label: "Gift — Charizard",
    packClass: "product",
    contents: "1 card, sealed",
    sealed: true,
    usd: 410,
    color: "#a78bfa",
    chain: "Base"
  }
]
