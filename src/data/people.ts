import type { Chain, PersonObj } from "@/types/objects"

/** You. The address is held in full rather than pre-truncated, because it seeds your avatar as well as
 *  being displayed — the same rule every contact follows. */
export const WALLET = { label: "You", address: "0x7Afd3C81b9E24f05a6D7c8B1e0F9a2D3c4B5e63D" }

/** Your own PackSpace Card identity — a Project G multichain wallet. */
export const ME = {
  name: "You",
  handle: "@you.pack",
  address: WALLET.address,
  chains: ["Base", "Ethereum", "Solana", "Bitcoin"] as Chain[]
}

// Laid out three across, two rows, anchored under the balance card. The two bare addresses are
// counterparties you've transacted with but never saved — their icons wear the warning treatment.
export const PEOPLE: PersonObj[] = [
  {
    id: "p-mum",
    class: "person",
    label: "Mum",
    handle: "@mum.base",
    trust: "mutual",
    hue: 152,
    chain: "Base",
    platform: "g",
    online: true,
    whitelisted: true,
    address: "0x43A6f2C81b9E24f05a6D7c8B1e0F9a2D3c4B5e10"
  },
  {
    id: "p-john",
    class: "person",
    label: "John MetaMask",
    handle: "@john.eth",
    trust: "verified",
    hue: 32,
    chain: "Ethereum",
    platform: "external",
    whitelisted: true,
    address: "0xe02C4b1A7c0D5e6F8a3B2c1D0e9F8a7b6C5d4Aa1"
  },
  {
    id: "p-4f47",
    class: "person",
    label: "0x4F47…",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 210,
    chain: "Base",
    platform: "external",
    whitelisted: false,
    address: "0x4F47b2C81b9E24f05a6D7c8B1e0F9a2D3c4B5c77"
  },
  {
    id: "p-98a3",
    class: "person",
    label: "0x98a3…",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 260,
    chain: "Ethereum",
    platform: "external",
    whitelisted: false,
    address: "0x98a3f2C81b9E24f05a6D7c8B1e0F9a2D3c4B5b19"
  },
  {
    id: "p-binance",
    class: "person",
    label: "Binance Wallet",
    handle: "@binance",
    trust: "confirmed",
    hue: 44,
    chain: "BNB",
    platform: "external",
    online: true,
    whitelisted: true,
    address: "0xfb39a2C81b9E24f05a6D7c8B1e0F9a2D3c4B5d02"
  },
  {
    id: "p-uniswap",
    class: "person",
    label: "Uniswap",
    handle: "@uniswap",
    trust: "verified",
    hue: 320,
    chain: "Ethereum",
    platform: "external",
    whitelisted: true,
    address: "0x9179a2C81b9E24f05a6D7c8B1e0F9a2D3c4B448d"
  }
]

export const EOA_PEOPLE: PersonObj[] = [
  {
    id: "e-jane",
    class: "person",
    label: "Jane",
    handle: "@jane.pack",
    trust: "unconfirmed",
    hue: 288,
    chain: "Base",
    platform: "g",
    online: true,
    whitelisted: true,
    wallet: "eoa",
    address: "0x5D1a7c81b9E24f05a6D7c8B1e0F9a2D3c4B57c40"
  },
  {
    id: "e-0x91fa",
    class: "person",
    label: "0x91Fa…",
    handle: "unconfirmed",
    trust: "unconfirmed",
    hue: 18,
    chain: "Base",
    platform: "external",
    whitelisted: false,
    wallet: "eoa",
    address: "0x91Fa6b3C0d8E5a2F7b1C4d9E0a6B3c8D5e2F1c72"
  }
]
