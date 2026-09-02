import { Desktop } from "@/components/desktop/Desktop"

// Full-viewport desktop. No document scroll — the desktop owns the screen (spec §3.13).
export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <Desktop />
    </main>
  )
}
