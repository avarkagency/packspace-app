"use client"

import { DOCK_GAP, DOCK_H, DOCK_W } from "@/const/desktop-layout"
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"

export type ToastTone = "alert" | "error" | "success"

const DOCK_CLEARANCE = 12

const TONE = {
  alert: { Icon: TriangleAlert, tint: "bg-warning/10", ring: "ring-warning/25", icon: "text-warning" },
  error: { Icon: CircleAlert, tint: "bg-danger/10", ring: "ring-danger/25", icon: "text-danger" },
  success: { Icon: CircleCheck, tint: "bg-[#13e192]/10", ring: "ring-[#13e192]/25", icon: "text-[#13e192]" }
} as const

export function DesktopToast({ tone, children }: { tone: ToastTone; children: React.ReactNode }) {
  const { Icon, tint, ring, icon } = TONE[tone]

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[180] flex justify-center px-24" style={{ bottom: DOCK_GAP + DOCK_H + DOCK_CLEARANCE }}>
      <div className={`glass panel-in relative max-w-full overflow-hidden rounded-12 ring-1 ${ring}`} style={{ width: DOCK_W }}>
        <div className={`absolute inset-0 ${tint}`} aria-hidden />
        <div className="relative flex items-start gap-10 px-16 py-12">
          <Icon className={`mt-1 size-16 shrink-0 ${icon}`} aria-hidden />
          <p role="status" className="text-12 leading-140 text-white">
            {children}
          </p>
        </div>
      </div>
    </div>
  )
}
