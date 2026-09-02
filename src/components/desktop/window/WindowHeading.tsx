import type { ReactNode } from "react"

type Props = {
  /** An object's own mark or face, wrapped in the ring the windows give it. */
  mark?: ReactNode
  /** A plain lucide glyph instead — unringed. */
  icon?: ReactNode
  title: ReactNode
  /** The pill under the title: a value, an address, a standard. */
  chip?: ReactNode
  /** Anything between the title and the rule — Move's wallet route. */
  children?: ReactNode
  /** A coin mark sits tighter to its title than a face or a glyph does. */
  gap?: 6 | 8
  /** The card's own padding, so the rule can bleed to its edges. */
  pad?: 24 | 28
}

/** Title, its pill and the rule that closes the header off — the shape every modal opens with. */
export function WindowHeading({ mark, icon, title, chip, children, gap = 8, pad = 28 }: Props) {
  return (
    <>
      <h2 className={`flex items-center ${gap === 6 ? "gap-6" : "gap-8"} text-18 leading-120 tracking-tight text-white`}>
        {mark && <span className="inline-flex shrink-0 rounded-full ring-1 ring-white">{mark}</span>}
        {icon}
        {title}
      </h2>
      {chip && <span className="tnum mt-8 inline-block rounded-full bg-white/20 px-6 py-2 text-10 leading-120 text-white/90">{chip}</span>}
      {children}
      <div className={`${pad === 24 ? "-mx-24 mt-20" : "-mx-28 mt-24"} h-px bg-white/20`} aria-hidden />
    </>
  )
}
