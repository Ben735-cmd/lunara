"use client"

import { Maximize2, Pause, Play, Timer } from "lucide-react"
import { MODE_LABEL, formatClock } from "../../lib/pomodoro"
import { useFocus } from "./FocusProvider"

/**
 * A small floating timer for the course page: shows the time left while studying, lets the student
 * pause or resume, and starts a focus block named after the course when nothing is running.
 */
export default function FocusPill({ courseTitle, onOpenFocus }: { courseTitle: string; onOpenFocus: () => void }) {
  const { timer, remaining, total, settings, start, pause } = useFocus()
  const started = timer.running || remaining < total
  const onBreak = timer.mode !== "focus"
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0

  if (!started) {
    return (
      <button
        onClick={() => start(courseTitle)}
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-lg transition-colors hover:bg-paper md:right-8"
      >
        <Timer size={16} aria-hidden="true" className="text-accent" />
        {onBreak ? `Start ${MODE_LABEL[timer.mode].toLowerCase()}` : `Focus ${settings.focus} min`}
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-5 right-4 z-40 overflow-hidden rounded-full border border-line bg-surface shadow-lg md:right-8"
      role="group"
      aria-label="Focus timer"
    >
      <div className="flex items-center gap-1 py-1.5 pl-5 pr-1.5">
        <div className="mr-2">
          <p role="timer" aria-label={`${formatClock(remaining)} left, ${MODE_LABEL[timer.mode]}`} className="text-lg font-semibold tabular-nums leading-tight text-ink">
            {formatClock(remaining)}
          </p>
          <p className={`text-[0.7rem] leading-tight ${onBreak ? "text-accent-strong" : "text-ink-muted"}`}>
            {onBreak ? MODE_LABEL[timer.mode] : timer.running ? "Focusing" : "Paused"}
          </p>
        </div>
        <button
          onClick={() => (timer.running ? pause() : start())}
          aria-label={timer.running ? "Pause timer" : "Resume timer"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-strong"
        >
          {timer.running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <button
          onClick={onOpenFocus}
          aria-label="Open the Focus page"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="h-1 w-full bg-line" aria-hidden="true">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
