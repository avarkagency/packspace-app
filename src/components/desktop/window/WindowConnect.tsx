"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { Check, Loader2 } from "lucide-react"

import { BaseBtn } from "@/components/base/BaseBtn"
import { WindowShell } from "@/components/desktop/window/WindowShell"

import { cue } from "@/lib/sound"
import { cn } from "@/lib/utils"
import { WALLETS, type Wallet, walletLabel } from "@/lib/wallets"

type Props = {
  wallet: Wallet
  z: number
  onClose: () => void
  onConnected: () => void
}

type Copy = { eyebrow?: string; title: string; body: string; steps: string[] }

const COPY: Record<Wallet, Copy> = {
  openfort: {
    eyebrow: "Welcome to PackSpace",
    title: "Connect your Openfort account",
    body: "Your smart account is your desk. Every asset, contact and pack you hold, on every chain, lives here. Connect it to proceed.",
    steps: ["Authorising your smart account", "Fetching balances across chains", "Laying out your desk"]
  },
  eoa: {
    title: "Connect your MetaMask wallet",
    body: "Connect a MetaMask wallet to open this desk and see everything this address holds on Base.",
    steps: ["Waiting for MetaMask approval", "Fetching balances on Base", "Laying out your desk"]
  }
}

const STEP_MS = 900

export function WindowConnect({ wallet, z, onClose, onConnected }: Props) {
  // refs
  // the desk hands a fresh callback every render; reading it through a ref keeps each step's timer from restarting
  const onConnectedRef = useRef(onConnected)

  // state
  // -1 is the ask; 0..steps.length-1 is the fake fetch; steps.length is done
  const [step, setStep] = useState(-1)

  // data
  const spec = WALLETS[wallet]
  const copy = COPY[wallet]
  const loading = step >= 0
  const done = step >= copy.steps.length

  // effects
  useEffect(() => {
    onConnectedRef.current = onConnected
  })

  useEffect(() => {
    if (step < 0) return
    if (done) {
      const t = setTimeout(() => {
        cue("sparkle") // keeps the close that follows from sounding like a cancel
        onConnectedRef.current()
      }, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [step, done])

  return (
    <WindowShell z={z} width={480} onClose={onClose} cardStyle={{ background: `rgba(10,10,24,0.55)` }}>
      <div className="p-28">
        <div className="glass grid size-48 place-items-center rounded-8">
          <Image src={spec.image} alt="" width={32} height={32} unoptimized className="size-32" />
        </div>

        {copy.eyebrow && <p className="mt-16 text-12 leading-120 tracking-tight text-white/70">{copy.eyebrow}</p>}
        <h2 className={cn(copy.eyebrow ? "mt-8" : "mt-16", "text-24 leading-120 font-light tracking-tight text-white")}>
          {done ? `${walletLabel(wallet)} connected` : loading ? `Connecting ${walletLabel(wallet)}…` : copy.title}
        </h2>

        {!loading && (
          <>
            <p className="mt-8 text-14 leading-160 text-white/70">{copy.body}</p>
            <div className="mt-28 flex gap-8">
              <BaseBtn variant="secondary" className="flex-1" onClick={onClose}>
                Not now
              </BaseBtn>
              <BaseBtn className="flex-1" onClick={() => setStep(0)}>
                Connect {walletLabel(wallet)}
              </BaseBtn>
            </div>
          </>
        )}

        {loading && (
          <ul className="mt-24 flex flex-col gap-12">
            {copy.steps.map((label, i) => (
              <li key={label} className={cn("flex items-center gap-8 text-14 leading-120 trans-base", i > step ? "text-white/40" : "text-white")}>
                <span className="grid size-20 shrink-0 place-items-center">
                  {i < step ? (
                    <Check className="size-16 text-success" />
                  ) : i === step ? (
                    <Loader2 className="size-16 animate-spin" />
                  ) : (
                    <span className="size-6 rounded-full bg-white/40" />
                  )}
                </span>
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </WindowShell>
  )
}
