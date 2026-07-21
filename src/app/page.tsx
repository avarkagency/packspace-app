import { DesktopWorkspace } from "@/components/workspace/DesktopWorkspace"

// Full-viewport desktop. No document scroll — the desktop owns the screen (spec §3.13).
export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <DesktopWorkspace />
    </main>
  )
}
