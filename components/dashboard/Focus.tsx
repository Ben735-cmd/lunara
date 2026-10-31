"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Pause, Play, RotateCcw, Settings as SettingsIcon, SkipForward, X } from "lucide-react"
import { getCurrentUser } from "../../lib/auth"
import { MODE_LABEL, cleanSettings, formatClock, type Mode } from "../../lib/pomodoro"
import { useFocus } from "../focus/FocusProvider"
import ReminderCard from "../ui/ReminderCard"
import PageHeader from "../ui/PageHeader"

const panel = "rounded-xl border border-line bg-surface p-6"
const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
const MODES: Mode[] = ["focus", "short", "long"]
const R = 120
const CIRC = 2 * Math.PI * R

export default function Focus({ backTo }: { backTo?: { label: string; onBack: () => void } }) {
  const { settings, timer, remaining, total, rows, statsFailed, stats, setPushState, start, pause, reset, skip, pickMode, setLabel, applySettings, removeSession } = useFocus()
  const [userId, setUserId] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [draft, setDraft] = useState<Record<"focus" | "short" | "long" | "rounds", string>>({ focus: "", short: "", long: "", rounds: "" })
  const [draftAuto, setDraftAuto] = useState(false)
  const [draftSound, setDraftSound] = useState(true)
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((user) => { if (!cancelled && user) setUserId(user.id) })
    return () => { cancelled = true }
  }, [])

  // Escape closes the settings panel.
  useEffect(() => {
    if (!showSettings) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowSettings(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showSettings])

  function openSettings() {
    setDraft({ focus: String(settings.focus), short: String(settings.short), long: String(settings.long), rounds: String(settings.rounds) })
    setDraftAuto(settings.autoStart)
    setDraftSound(settings.sound)
    setSavedNote(false)
    setShowSettings(true)
  }

  function saveSettings() {
    applySettings(
      cleanSettings({
        focus: Number(draft.focus),
        short: Number(draft.short),
        long: Number(draft.long),
        rounds: Number(draft.rounds),
        autoStart: draftAuto,
        sound: draftSound,
      })
    )
    setShowSettings(false)
    setSavedNote(true)
    setTimeout(() => setSavedNote(false), 3000)
  }

  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const clock = formatClock(remaining)

  const subtitle = "Work in focused blocks with short breaks in between. Finished blocks are saved so you can see your week."
  const settingsButton = (
    <button
      onClick={() => (showSettings ? setShowSettings(false) : openSettings())}
      aria-expanded={showSettings}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
    >
      <SettingsIcon size={16} aria-hidden="true" /> <span className="sm:hidden">Settings</span><span className="hidden sm:inline">Timer settings</span>
    </button>
  )

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {backTo ? (
        <>
          {/* Back and Settings share one row so they line up */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={backTo.onBack}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <ArrowLeft size={16} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{backTo.label}</span>
            </button>
            {settingsButton}
          </div>
          <PageHeader title="Focus" subtitle={subtitle} />
        </>
      ) : (
        <PageHeader title="Focus" subtitle={subtitle} action={settingsButton} />
      )}

      {savedNote && !showSettings && (
        <p role="status" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-tint px-3.5 py-2 text-sm font-medium text-accent-strong">
          <Check size={16} aria-hidden="true" /> Settings saved
        </p>
      )}

      {showSettings && (
        <div className={`${panel} mt-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Timer settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {([
              ["focus", "Focus (min)", 1, 120],
              ["short", "Short break (min)", 1, 60],
              ["long", "Long break (min)", 1, 90],
              ["rounds", "Rounds before long break", 2, 8],
            ] as const).map(([key, label, min, max]) => (
              <div key={key}>
                <label htmlFor={`set-${key}`} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
                <input
                  id={`set-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-ink-muted">{min} to {max}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={draftAuto} onChange={(e) => setDraftAuto(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
              Start the next block automatically
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={draftSound} onChange={(e) => setDraftSound(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
              Play a sound when a block ends
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper sm:flex-none sm:px-6"
            >
              Cancel
            </button>
            <button
              onClick={() => setDraft({ focus: "25", short: "5", long: "15", rounds: "4" })}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Reset to defaults
            </button>
            <button
              onClick={saveSettings}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong sm:ml-auto sm:flex-none sm:px-8"
            >
              Save settings
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className={`${panel} flex flex-col items-center`}>
          <div role="tablist" aria-label="Timer mode" className="flex gap-1 rounded-xl bg-paper p-1">
            {MODES.map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={timer.mode === m}
                onClick={() => pickMode(m)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  timer.mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span className="sm:hidden">{m === "focus" ? "Focus" : m === "short" ? "Short" : "Long"}</span>
                <span className="hidden sm:inline">{MODE_LABEL[m]}</span>
              </button>
            ))}
          </div>

          <div className="relative mt-8 h-[280px] w-[280px] max-w-full">
            <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" className="stroke-line" />
              <circle
                cx="140"
                cy="140"
                r={R}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className="stroke-accent"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                style={{ transition: timer.running ? "stroke-dashoffset 0.25s linear" : "none" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p
                role="timer"
                aria-label={`${clock} left, ${MODE_LABEL[timer.mode]}`}
                className="text-6xl font-semibold tabular-nums tracking-tight text-ink"
              >
                {clock}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{MODE_LABEL[timer.mode]}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2" aria-label={`Round ${timer.round} of ${settings.rounds}`}>
            {Array.from({ length: settings.rounds }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i + 1 < timer.round || (i + 1 === timer.round && timer.mode !== "focus") ? "bg-accent" : i + 1 === timer.round ? "bg-accent/50" : "bg-line"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-ink-muted">Round {timer.round} of {settings.rounds}</span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={reset}
              aria-label="Reset timer"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
            {timer.running ? (
              <button
                onClick={pause}
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full bg-accent px-8 py-3 text-base font-medium text-on-accent transition-colors hover:bg-accent-strong"
              >
                <Pause size={18} aria-hidden="true" /> Pause
              </button>
            ) : (
              <button
                onClick={() => start()}
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full bg-accent px-8 py-3 text-base font-medium text-on-accent transition-colors hover:bg-accent-strong"
              >
                <Play size={18} aria-hidden="true" /> {timer.remainingMs < total ? "Resume" : "Start"}
              </button>
            )}
            <button
              onClick={skip}
              aria-label="Skip to next block"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <SkipForward size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 w-full max-w-sm">
            <label htmlFor="focus-label" className="mb-1.5 block text-center text-sm font-medium text-ink">What are you working on?</label>
            <input
              id="focus-label"
              type="text"
              maxLength={80}
              placeholder="e.g. Networks past paper"
              value={timer.label}
              onChange={(e) => setLabel(e.target.value)}
              className={`${inputClass} text-center`}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className={panel}>
            <h2 className="mb-1 text-lg font-semibold text-ink">Today</h2>
            <p className="text-sm text-ink-muted">
              <span className="text-2xl font-semibold tabular-nums text-ink">{stats.todayMinutes}</span> min across{" "}
              {stats.todayCount} {stats.todayCount === 1 ? "block" : "blocks"}
            </p>
            <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label="Focus minutes for the last 7 days">
              {stats.days.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-16 w-full items-end">
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{ height: `${d.minutes ? Math.max(6, (d.minutes / stats.max) * 100) : 0}%` }}
                      title={`${d.minutes} min`}
                    />
                  </div>
                  <span className="text-[0.65rem] text-ink-muted">{d.label}</span>
                </div>
              ))}
            </div>
            {statsFailed && <p role="alert" className="mt-3 text-xs text-danger">Could not load your focus history.</p>}
          </div>

          <ReminderCard
            userId={userId}
            description="Get a notification when a block ends, even if Lunara is closed or your phone is locked."
            onChange={setPushState}
          />

          {rows.length > 0 && (
            <div className={panel}>
              <h2 className="mb-3 text-lg font-semibold text-ink">Recent blocks</h2>
              <ul className="space-y-2">
                {rows.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{r.label || "Focus block"}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
                      {r.minutes} min
                      <button
                        onClick={() => removeSession(r.id)}
                        aria-label="Delete this block"
                        className="rounded px-1 text-ink-muted hover:text-danger"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

    </section>
  )
}
