"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, CalendarClock, Check, MapPin, Pause, Play, Square } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { formatDateLong } from "../../lib/dates"
import { hhmm, type ClassRow } from "../../lib/timetable"
import { MODE_LABEL, formatClock } from "../../lib/pomodoro"
import { celebrate } from "../../lib/celebrate"
import { useFocus } from "../focus/FocusProvider"

type Assignment = { id: string; title: string; due_date: string; completed: boolean }
type Session = { id: string; title: string; date: string; start_time: string; end_time: string }
type Item = { key: string; kind: "class" | "study"; title: string; place?: string | null; start: string; end: string }

function localDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function minutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Everything a student needs for today in one place: classes, study sessions, what is due and focus time. */
export default function TodayCard({
  userId,
  assignments,
  onToggleAssignment,
  onOpenTimetable,
}: {
  userId: string
  assignments: Assignment[]
  onToggleAssignment: (id: string, completed: boolean) => void
  onOpenTimetable: () => void
}) {
  const { stats, timer, remaining, total, start, pause, reset } = useFocus()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const today = new Date()
    Promise.all([
      supabase.from("timetable_classes").select("*").eq("user_id", userId).eq("day_of_week", today.getDay()),
      supabase.from("study_sessions").select("id, title, date, start_time, end_time").eq("user_id", userId).eq("date", localDay(today)),
    ]).then(([c, s]) => {
      if (cancelled) return
      setFailed(!!c.error || !!s.error)
      setClasses((c.data ?? []) as ClassRow[])
      setSessions((s.data ?? []) as Session[])
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [userId])

  // Keeps "Now" and "Done" fresh while the dashboard stays open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const schedule = useMemo<Item[]>(() => {
    const items: Item[] = [
      ...classes.map((c): Item => ({ key: `c-${c.id}`, kind: "class", title: c.title, place: c.location, start: hhmm(c.start_time), end: hhmm(c.end_time) })),
      ...sessions.map((s): Item => ({ key: `s-${s.id}`, kind: "study", title: s.title, start: hhmm(s.start_time), end: hhmm(s.end_time) })),
    ]
    return items.sort((a, b) => minutes(a.start) - minutes(b.start))
  }, [classes, sessions])

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const today = localDay(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = localDay(tomorrowDate)

  const due = useMemo(
    () =>
      assignments
        .filter((a) => !a.completed && a.due_date <= tomorrow)
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [assignments, tomorrow]
  )

  const nextIndex = schedule.findIndex((i) => minutes(i.end) > nowMin)
  const started = timer.running || remaining < total

  return (
    <section aria-labelledby="today-title" className="mt-6 rounded-xl border border-accent/30 bg-accent-tint/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="today-title" className="text-xl font-semibold text-ink">Today</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{formatDateLong(now)}</p>
        </div>
        {started ? (
          <div role="group" aria-label="Focus timer" className="flex items-center gap-1 rounded-full border border-line bg-paper py-1 pl-4 pr-1">
            <div className="mr-2">
              <p role="timer" aria-label={`${formatClock(remaining)} left, ${MODE_LABEL[timer.mode]}`} className="text-base font-semibold tabular-nums leading-tight text-ink">
                {formatClock(remaining)}
              </p>
              <p className="text-[0.7rem] leading-tight text-ink-muted">
                {timer.mode !== "focus" ? MODE_LABEL[timer.mode] : timer.running ? "Focusing" : "Paused"}
              </p>
            </div>
            <button
              onClick={() => (timer.running ? pause() : start())}
              aria-label={timer.running ? "Pause timer" : "Resume timer"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-strong"
            >
              {timer.running ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            </button>
            <button
              onClick={() => reset()}
              aria-label="Stop timer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-danger"
            >
              <Square size={15} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => start()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Play size={16} aria-hidden="true" />
            Start focus
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Schedule */}
        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Schedule</h3>
          {!loaded ? (
            <div role="status" aria-busy="true" aria-label="Loading schedule" className="h-20 animate-pulse rounded-lg bg-paper" />
          ) : schedule.length === 0 ? (
            <div className="rounded-lg bg-paper px-4 py-5 text-sm text-ink-muted">
              Nothing scheduled today.{" "}
              <button onClick={onOpenTimetable} className="font-medium text-accent-strong underline-offset-2 hover:underline">
                Add your classes
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {schedule.map((item, i) => {
                const over = minutes(item.end) <= nowMin
                const live = !over && minutes(item.start) <= nowMin
                return (
                  <li
                    key={item.key}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 ${
                      live ? "border-accent bg-accent-tint" : "border-line bg-paper"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-ink-muted">
                      {item.kind === "class" ? <CalendarClock size={16} aria-hidden="true" /> : <BookOpen size={16} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium tabular-nums text-accent-strong">
                        {item.start} – {item.end}
                        {live && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] text-on-accent">Now</span>}
                        {!live && !over && i === nextIndex && <span className="ml-2 rounded-full bg-surface px-1.5 py-0.5 text-[0.65rem] text-ink-muted">Next</span>}
                      </p>
                      <p className={`mt-0.5 break-words text-sm font-medium ${over ? "text-ink-muted" : "text-ink"}`}>{item.title}</p>
                      {item.place && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin size={12} aria-hidden="true" /> {item.place}
                        </p>
                      )}
                    </div>
                    {over && <Check size={16} aria-label="Finished" className="mt-0.5 shrink-0 text-ink-muted" />}
                  </li>
                )
              })}
            </ul>
          )}
          {failed && <p role="alert" className="mt-2 text-xs text-danger">Could not load part of your schedule.</p>}
        </div>

        {/* Due soon */}
        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Due today and tomorrow</h3>
          {due.length === 0 ? (
            <div className="rounded-lg bg-paper px-4 py-5 text-sm text-ink-muted">Nothing due. Nice and clear.</div>
          ) : (
            <ul className="space-y-2">
              {due.map((a) => {
                const overdue = a.due_date < today
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3.5 py-3">
                    <button
                      onClick={(e) => { celebrate({ x: e.clientX, y: e.clientY }); onToggleAssignment(a.id, a.completed) }}
                      role="checkbox"
                      aria-checked={false}
                      aria-label={`Mark ${a.title} as done`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface transition-colors hover:border-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-ink">{a.title}</p>
                      <p className="mt-1 text-xs">
                        {overdue ? (
                          <span className="rounded-full bg-danger-tint px-2 py-0.5 font-semibold text-danger">Overdue</span>
                        ) : (
                          <span className="font-medium text-ink-muted">{a.due_date === today ? "Due today" : "Due tomorrow"}</span>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">
        <span className="font-semibold tabular-nums text-ink">{stats.todayMinutes}</span> min of focus today across{" "}
        {stats.todayCount} {stats.todayCount === 1 ? "block" : "blocks"}
      </p>
    </section>
  )
}
