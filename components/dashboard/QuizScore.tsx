"use client"

import { useEffect, useRef, useState } from "react"
import { celebrate } from "../../lib/celebrate"

function verdict(percent: number) {
  if (percent === 100) return "Perfect score! 🎉"
  if (percent >= 80) return "Excellent work!"
  if (percent >= 60) return "Good job, nearly there."
  if (percent >= 40) return "Getting there. Review and try again."
  return "Keep going. Every attempt helps."
}

/** The quiz result: a ring that fills up while the percentage counts up, with a burst for good scores. */
export default function QuizScore({ score, total, onRetry, onNew, busy }: { score: number; total: number; onRetry: () => void; onNew: () => void; busy?: boolean }) {
  const percent = total ? Math.round((score / total) * 100) : 0
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const finish = () => {
      setShown(percent)
      setDone(true)
      if (percent >= 70) {
        const r = box.current?.getBoundingClientRect()
        celebrate({ x: r ? r.left + r.width / 2 : undefined, y: r ? r.top + 90 : undefined, big: percent >= 90 })
      }
    }
    if (reduce || percent === 0) { finish(); return }
    const duration = 400 + percent * 18
    const start = performance.now() + 250
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setShown(Math.round(percent * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
      else finish()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [percent])

  const R = 52
  const C = 2 * Math.PI * R
  const tone = percent >= 70 ? "text-accent" : percent >= 40 ? "text-amber-500" : "text-danger"

  return (
    <div ref={box} role="status" aria-label={`You scored ${score} out of ${total}, ${percent} percent`} className="anim-pop rounded-2xl border border-accent/25 bg-accent-tint/60 p-6 text-center">
      <div className={`relative mx-auto h-40 w-40 ${done && percent >= 90 ? "pulse-ring rounded-full" : ""}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-line" />
          <circle
            cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
            className={`stroke-current ${tone}`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - shown / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tabular-nums text-ink">{shown}<span className="text-2xl">%</span></span>
          <span className="text-xs text-ink-muted">{score} / {total} correct</span>
        </div>
      </div>
      <p className={`mt-4 text-lg font-semibold text-ink transition-all duration-500 ${done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        {verdict(percent)}
      </p>
      <div className={`mt-5 grid gap-3 transition-opacity duration-500 sm:grid-cols-2 ${done ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <button onClick={onRetry} disabled={busy} className="rounded-lg border border-accent/30 bg-surface py-3 text-sm font-medium text-accent-strong transition-colors hover:bg-accent-tint disabled:opacity-50">
          Try same quiz again
        </button>
        <button onClick={onNew} disabled={busy} className="rounded-lg bg-accent py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50">
          {busy ? "Generating..." : "New quiz"}
        </button>
      </div>
    </div>
  )
}
