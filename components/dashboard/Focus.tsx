"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, RotateCcw, Settings as SettingsIcon, SkipForward } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import type { PushState } from "../../lib/push"
import {
  MODE_LABEL,
  cleanSettings,
  durationMs,
  formatClock,
  freshState,
  loadSaved,
  makeChime,
  nextMode,
  save,
  type Mode,
  type Settings,
  type TimerState,
} from "../../lib/pomodoro"
import ReminderCard from "../ui/ReminderCard"

type FocusRow = { id: string; created_at: string; minutes: number; label: string | null }

const panel = "rounded-xl border border-line bg-surface p-6"
const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
const MODES: Mode[] = ["focus", "short", "long"]
const R = 120
const CIRC = 2 * Math.PI * R

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function Focus() {
  const [saved] = useState(loadSaved)
  const [settings, setSettings] = useState<Settings>(saved.settings)
  const [timer, setTimer] = useState<TimerState>(saved.timer)
  const [now, setNow] = useState(() => Date.now())
  const [userId, setUserId] = useState("")
  const [pushState, setPushState] = useState<PushState | "loading">("loading")
  const [rows, setRows] = useState<FocusRow[]>([])
  const [statsFailed, setStatsFailed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const timerRef = useRef(timer)
  const settingsRef = useRef(settings)
  const userRef = useRef(userId)
  const pushRef = useRef<PushState | "loading">(pushState)
  const chimeRef = useRef<(() => void) | null>(null)
  const finishingRef = useRef(false)
  useEffect(() => { timerRef.current = timer }, [timer])
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { userRef.current = userId }, [userId])
  useEffect(() => { pushRef.current = pushState }, [pushState])
  useEffect(() => { save(settings, timer) }, [settings, timer])

  const loadStats = useCallback(async (uid: string) => {
    const since = new Date(Date.now() - 7 * 86_400_000)
    since.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("id, created_at, minutes, label")
      .eq("user_id", uid)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
    setStatsFailed(!!error)
    setRows((data ?? []) as FocusRow[])
  }, [])

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((user) => {
      if (cancelled || !user) return
      setUserId(user.id)
      loadStats(user.id)
    })
    return () => { cancelled = true }
  }, [loadStats])

  /** Keeps one pending server alert in step with the running timer, so it can ring with the app closed. */
  const syncAlert = useCallback(async (endsAt: number | null, mode: Mode) => {
    const uid = userRef.current
    if (!uid || pushRef.current !== "on") return
    try {
      await supabase.from("timer_alerts").delete().eq("user_id", uid).eq("sent", false)
      if (endsAt) {
        const focus = mode === "focus"
        await supabase.from("timer_alerts").insert({
          user_id: uid,
          fire_at: new Date(endsAt).toISOString(),
          title: focus ? "Focus block done" : "Break is over",
          body: focus ? "Nice work. Time to take a break." : "Ready for the next focus block?",
        })
      }
    } catch {
      // the on-screen timer still works without the background alert
    }
  }, [])

  const notifyLocal = useCallback(async (title: string, body: string) => {
    if (!document.hidden || typeof Notification === "undefined" || Notification.permission !== "granted") return
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.showNotification(title, { body, tag: "pomodoro", icon: "/icon-192.png" })
    } catch {
      // ignore: the server alert or the chime covers it
    }
  }, [])

  const finish = useCallback(() => {
    if (finishingRef.current) return
    finishingRef.current = true
    const t = timerRef.current
    const s = settingsRef.current
    const wasFocus = t.mode === "focus"
    const next = nextMode(t.mode, t.round, s)
    const auto = s.autoStart
    const base = freshState(s, next.mode, next.round, t.label)
    const endsAt = auto ? Date.now() + base.remainingMs : null
    setTimer(auto ? { ...base, running: true, endsAt } : base)

    if (s.sound) chimeRef.current?.()
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* not supported */ }
    notifyLocal(wasFocus ? "Focus block done" : "Break is over", wasFocus ? "Nice work. Time to take a break." : "Ready for the next focus block?")
    syncAlert(endsAt, next.mode)

    if (wasFocus && userRef.current) {
      supabase
        .from("focus_sessions")
        .insert({ user_id: userRef.current, minutes: Math.max(1, Math.round(durationMs("focus", s) / 60000)), label: t.label.trim() || null })
        .then(() => loadStats(userRef.current))
    }
    setTimeout(() => { finishingRef.current = false }, 500)
  }, [loadStats, notifyLocal, syncAlert])

  // Ticking is based on the end time, so a throttled background tab never drifts.
  useEffect(() => {
    if (!timer.running) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const end = timerRef.current.endsAt
      if (end !== null && t >= end) finish()
    }
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [timer.running, timer.endsAt, finish])

  const remaining = timer.running && timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.remainingMs
  const total = durationMs(timer.mode, settings)

  // Countdown in the browser tab title.
  useEffect(() => {
    if (!timer.running) return
    const original = document.title
    document.title = `${formatClock(remaining)} · ${MODE_LABEL[timer.mode]}`
    return () => { document.title = original }
  }, [timer.running, timer.mode, remaining])

  // Keep the screen awake while running, where the browser allows it.
  useEffect(() => {
    if (!timer.running) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const grab = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null
        if (cancelled) lock?.release().catch(() => {})
      } catch { /* denied or unsupported */ }
    }
    grab()
    const again = () => { if (!document.hidden) grab() }
    document.addEventListener("visibilitychange", again)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", again)
      lock?.release().catch(() => {})
    }
  }, [timer.running])

  function start() {
    if (!chimeRef.current) chimeRef.current = makeChime()
    if (typeof Notification !== "undefined" && Notification.permission === "default" && pushRef.current === "off") {
      // not asked here: the Reminders card is where permission is requested
    }
    const endsAt = Date.now() + timer.remainingMs
    setNow(Date.now())
    setTimer({ ...timer, running: true, endsAt })
    syncAlert(endsAt, timer.mode)
  }

  function pause() {
    const left = timer.endsAt ? Math.max(1000, timer.endsAt - Date.now()) : timer.remainingMs
    setTimer({ ...timer, running: false, endsAt: null, remainingMs: left })
    syncAlert(null, timer.mode)
  }

  function reset() {
    setTimer(freshState(settings, timer.mode, timer.round, timer.label))
    syncAlert(null, timer.mode)
  }

  function skip() {
    const next = nextMode(timer.mode, timer.round, settings)
    setTimer(freshState(settings, next.mode, next.round, timer.label))
    syncAlert(null, next.mode)
  }

  function pickMode(mode: Mode) {
    if (mode === timer.mode) return
    setTimer(freshState(settings, mode, timer.round, timer.label))
    syncAlert(null, mode)
  }

  function updateSettings(patch: Partial<Settings>) {
    const next = cleanSettings({ ...settings, ...patch })
    setSettings(next)
    // an idle timer follows the new length straight away
    if (!timer.running) setTimer({ ...timer, remainingMs: durationMs(timer.mode, next) })
  }

  async function removeSession(id: string) {
    setRows((r) => r.filter((x) => x.id !== id))
    await supabase.from("focus_sessions").delete().eq("id", id)
  }

  const stats = useMemo(() => {
    const today = dayKey(new Date())
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "short" }), minutes: 0 }
    })
    let todayMinutes = 0
    let todayCount = 0
    for (const r of rows) {
      const k = dayKey(new Date(r.created_at))
      const slot = days.find((d) => d.key === k)
      if (slot) slot.minutes += r.minutes
      if (k === today) { todayMinutes += r.minutes; todayCount++ }
    }
    return { days, todayMinutes, todayCount, max: Math.max(30, ...days.map((d) => d.minutes)) }
  }, [rows])

  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const clock = formatClock(remaining)

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Focus</h1>
        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
        >
          <SettingsIcon size={16} aria-hidden="true" /> Timer settings
        </button>
      </div>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Work in focused blocks with short breaks in between. Finished blocks are saved so you can see your week.
      </p>

      {showSettings && (
        <div className={`${panel} mt-6`}>
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
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => updateSettings({ [key]: e.target.value === "" ? settings[key] : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => updateSettings({ autoStart: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Start the next block automatically
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => updateSettings({ sound: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Play a sound when a block ends
            </label>
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
                {MODE_LABEL[m]}
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
                onClick={start}
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
              onChange={(e) => setTimer({ ...timer, label: e.target.value })}
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
