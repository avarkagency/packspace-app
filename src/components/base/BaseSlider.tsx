"use client"

type Props = {
  min?: number
  max: number
  step: number
  value: number
  label?: string
  ariaLabel: string
  onChange: (v: number) => void
}

export function BaseSlider({ min = 0, max, step, value, onChange, label, ariaLabel }: Props) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div className="relative h-40 overflow-hidden rounded-md">
      <div className="absolute inset-0 rounded-md bg-white/10" />
      <div className="absolute inset-y-0 left-0 border-r border-white bg-white/25" style={{ width: `${pct}%` }} aria-hidden />
      {label != null && (
        <span className="tnum pointer-events-none absolute inset-0 flex items-center px-14 text-12 leading-120 font-medium text-white">{label}</span>
      )}
      <span className="pointer-events-none absolute inset-y-4 w-12 rounded-sm bg-white shadow-sm" style={{ left: `calc(${pct}% - 6px)` }} aria-hidden />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={ariaLabel}
      />
    </div>
  )
}
