import { PackSpaceWorkspace } from "@/components/workspace/PackSpaceWorkspace"

// Full-viewport workspace. No document scroll — the canvas owns the screen (spec §3.13).
export default function Home() {
  return (
    <main className="fui-field fixed inset-0 overflow-hidden">
      <PackSpaceWorkspace />
    </main>
  )
}
