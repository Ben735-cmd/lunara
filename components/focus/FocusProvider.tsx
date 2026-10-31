"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Check } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { getPushState, type PushState } from "../../lib/push"
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

export type FocusRow = { id: string; created_at: string; minutes: number; label: string | null }
type Done = { minutes: number; label: string; message: string; autoStarted: boolean }

const PRAISE = [
  "Well done! That was a solid block of focus.",
  "Great work! Every block gets you closer to the exam.",
  "Session complete. Your future self says thank you.",
  "Nicely done! Consistency beats cramming.",
  "Focus block finished. You earned this break.",
]

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

type FocusApi = {
  settings: Settings
  timer: TimerState
  /** Milliseconds left in the current block. */
  remaining: number
  total: number
  rows: FocusRow[]
  statsFailed: boolean
  stats: { days: { key: string; label: string; minutes: number }[]; todayMinutes: number; todayCount: number; max: number }
  pushState: PushState | "loading"
  setPushState: (s: PushState) => void
  start: (label?: string) => void
  pause: () => void
  reset: () => void
  skip: () => void
  pickMode: (mode: Mode) => void
  setLabel: (label: string) => void
  applySettings: (next: Settings) => void
  removeSession: (id: string) => void
}

const FocusContext = createContext<FocusApi | null>(null)

export function useFocus() {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error("useFocus must be used inside FocusProvider")
  return ctx
}

/**
 * Owns the Pomodoro timer for the whole dashboard, so it keeps counting (and can celebrate)
 * whichever page the student is on: the Focus page, a course, their notes, anywhere.
 */
export default function FocusProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(loadSaved)
  const [settings, setSettings] = useState<Settings>(saved.settings)
  const [timer, setTimer] = useState<TimerState>(saved.timer)
  const [now, setNow] = useState(() => Date.now())
  const [userId, setUserId] = useState("")
  const [pushState, setPushState] = useState<PushState | "loading">("loading")
  const [rows, setRows] = useState<FocusRow[]>([])
  const [statsFailed, setStatsFailed] = useState(false)
  const [done, setDone] = useState<Done | null>(null)

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
    getPushState().then((s) => { if (!cancelled) setPushState(s) })
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

    if (wasFocus) {
      const minutes = Math.max(1, Math.round(durationMs("focus", s) / 60000))
      setDone({
        minutes,
        label: t.label.trim(),
        message: PRAISE[Math.floor(Math.random() * PRAISE.length)],
        autoStarted: auto,
      })
      if (userRef.current) {
        supabase
          .from("focus_sessions")
          .insert({ user_id: userRef.current, minutes, label: t.label.trim() || null })
          .then(() => loadStats(userRef.current))
      }
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

  // Escape closes the congratulations card.
  useEffect(() => {
    if (!done) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDone(null) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [done])

  const start = useCallback((label?: string) => {
    const t = timerRef.current
    if (t.running) return
    if (!chimeRef.current) chimeRef.current = makeChime()
    const endsAt = Date.now() + t.remainingMs
    setNow(Date.now())
    setTimer({ ...t, label: t.label || label || "", running: true, endsAt })
    syncAlert(endsAt, t.mode)
  }, [syncAlert])

  const pause = useCallback(() => {
    const t = timerRef.current
    const left = t.endsAt ? Math.max(1000, t.endsAt - Date.now()) : t.remainingMs
    setTimer({ ...t, running: false, endsAt: null, remainingMs: left })
    syncAlert(null, t.mode)
  }, [syncAlert])

  const reset = useCallback(() => {
    const t = timerRef.current
    setTimer(freshState(settingsRef.current, t.mode, t.round, t.label))
    syncAlert(null, t.mode)
  }, [syncAlert])

  const skip = useCallback(() => {
    const t = timerRef.current
    const s = settingsRef.current
    const next = nextMode(t.mode, t.round, s)
    setTimer(freshState(s, next.mode, next.round, t.label))
    syncAlert(null, next.mode)
  }, [syncAlert])

  const pickMode = useCallback((mode: Mode) => {
    const t = timerRef.current
    if (mode === t.mode) return
    setTimer(freshState(settingsRef.current, mode, t.round, t.label))
    syncAlert(null, mode)
  }, [syncAlert])

  const setLabel = useCallback((label: string) => setTimer((t) => ({ ...t, label })), [])

  const applySettings = useCallback((next: Settings) => {
    const clean = cleanSettings(next)
    setSettings(clean)
    // a running block keeps its length; an idle timer follows the new length straight away
    setTimer((t) => (t.running ? t : { ...t, remainingMs: durationMs(t.mode, clean), round: Math.min(t.round, clean.rounds) }))
  }, [])

  const removeSession = useCallback(async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id))
    await supabase.from("focus_sessions").delete().eq("id", id)
  }, [])

  const startBreak = () => {
    setDone(null)
    start()
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

  const api: FocusApi = {
    settings, timer, remaining, total, rows, statsFailed, stats, pushState, setPushState,
    start, pause, reset, skip, pickMode, setLabel, applySettings, removeSession,
  }

  return (
    <FocusContext.Provider value={api}>
      {children}
      {done && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-5" onClick={() => setDone(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="done-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 text-center shadow-xl"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-tint text-accent-strong">
              <Check size={28} aria-hidden="true" />
            </span>
            <h2 id="done-title" className="mt-4 text-2xl font-semibold tracking-tight text-ink">Session complete</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{done.message}</p>
            <p className="mt-4 text-sm text-ink">
              You focused for <span className="font-semibold">{done.minutes} {done.minutes === 1 ? "minute" : "minutes"}</span>
              {done.label ? <> on <span className="font-semibold">{done.label}</span></> : null}.
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Today: {stats.todayMinutes + (stats.todayCount === 0 ? done.minutes : 0)} min of focus
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDone(null)}
                className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                {done.autoStarted ? "Got it" : "Not now"}
              </button>
              {!done.autoStarted && (
                <button
                  onClick={startBreak}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
                >
                  Start break
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </FocusContext.Provider>
  )
}
