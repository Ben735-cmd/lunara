"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { CalendarSkeleton } from "../ui/Skeleton"
import { disablePush, enablePush, getPushState, sendTestNotification, type PushState } from "../../lib/push"
import PageHeader from "../ui/PageHeader"
import { formatDate as fmtDate, formatDateLong } from "../../lib/dates"

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
}

type StudySession = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  starts_at?: string | null
  remind_minutes?: number | null
}

const REMINDER_CHOICES = [
  { minutes: 0, label: "When it starts" },
  { minutes: 5, label: "5 minutes before" },
  { minutes: 10, label: "10 minutes before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
]

/** When a session starts, from its saved start time or, for older sessions, its date and clock time. */
function startOf(s: StudySession): Date | null {
  const d = s.starts_at ? new Date(s.starts_at) : new Date(`${s.date}T${s.start_time}`)
  return Number.isNaN(d.getTime()) ? null : d
}

function untilText(start: Date, now: Date) {
  const mins = Math.round((start.getTime() - now.getTime()) / 60000)
  if (mins <= 0) return "now"
  if (mins < 60) return `in ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours} h ${mins % 60 ? `${mins % 60} min` : ""}`.trim()
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? "" : "s"}`
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

export default function Calendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [userId, setUserId] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [today] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [adding, setAdding] = useState(false)
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionDate, setSessionDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [remindMinutes, setRemindMinutes] = useState(15)
  const [formError, setFormError] = useState("")
  const [pushState, setPushState] = useState<PushState | "loading">("loading")
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState("")
  const [now, setNow] = useState(() => new Date())

  async function fetchData() {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)

    const { data: aData } = await supabase.from("assignments").select("*").eq("user_id", user.id)
    setAssignments(aData || [])

    const { data: sData } = await supabase.from("study_sessions").select("*").eq("user_id", user.id)
    setSessions(sData || [])
    setLoaded(true)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { getPushState().then(setPushState) }, [])
  // Keeps the "starts in" countdown fresh while the page is open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  async function turnOnReminders() {
    setPushBusy(true)
    setPushMessage("")
    try {
      setPushState(await enablePush(userId))
    } catch {
      setPushMessage("Could not turn on reminders. Check your connection and try again.")
    }
    setPushBusy(false)
  }

  async function turnOffReminders() {
    setPushBusy(true)
    setPushMessage("")
    setPushState(await disablePush())
    setPushBusy(false)
  }

  async function testReminder() {
    setPushBusy(true)
    setPushMessage("")
    const problem = await sendTestNotification()
    setPushMessage(problem ?? "Sent. It should arrive in a few seconds.")
    setPushBusy(false)
  }

  async function saveSession() {
    if (!sessionTitle.trim() || !sessionDate || !startTime || !endTime) {
      setFormError("Fill in the title, date, start and end time.")
      return
    }
    if (endTime <= startTime) {
      setFormError("The end time must be after the start time.")
      return
    }
    const start = new Date(`${sessionDate}T${startTime}`)
    if (start.getTime() < Date.now()) {
      setFormError("That start time has already passed. Pick a time in the future.")
      return
    }
    setSaving(true)
    setFormError("")
    const { error } = await supabase.from("study_sessions").insert([{
      title: sessionTitle.trim(), date: sessionDate,
      start_time: startTime, end_time: endTime, user_id: userId,
      starts_at: start.toISOString(), remind_minutes: remindMinutes,
    }])
    setSaving(false)
    if (error) {
      setFormError("Could not save the session. Please try again.")
      return
    }
    setSessionTitle(""); setSessionDate(""); setStartTime(""); setEndTime(""); setRemindMinutes(15)
    setAdding(false)
    fetchData()
  }

  async function deleteSession(id: string) {
    await supabase.from("study_sessions").delete().eq("id", id)
    fetchData()
  }

  // Build calendar days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function formatDate(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  function getEventsForDay(day: number) {
    const dateStr = formatDate(currentYear, currentMonth, day)
    const dayAssignments = assignments.filter(a => a.due_date === dateStr)
    const daySessions = sessions.filter(s => s.date === dateStr)
    return { dayAssignments, daySessions }
  }

  const selectedEvents = selectedDay ? {
    dayAssignments: assignments.filter(a => a.due_date === selectedDay),
    daySessions: sessions.filter(s => s.date === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  } : null

  const panel = "rounded-xl border border-line bg-surface p-6"
  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
  const navButton =
    "rounded-lg border border-line p-2 text-ink-muted transition-colors hover:bg-paper hover:text-ink"

  const pendingAssignments = assignments.filter(a => !a.completed)

  const nextSession = sessions
    .map((session) => ({ session, start: startOf(session) }))
    .filter((x): x is { session: StudySession; start: Date } => !!x.start && x.start.getTime() > now.getTime() - 60_000)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null

  if (!loaded) return <CalendarSkeleton />

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <PageHeader
        title="Calendar"
        subtitle="See your deadlines and plan study sessions in one place."
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Plus size={16} aria-hidden="true" /> Study session
          </button>
        }
      />

      {/* Add session form */}
      {adding && (
        <div className={`${panel} mt-8`}>
          <h2 className="mb-4 text-lg font-semibold text-ink">New study session</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="session-title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
              <input
                id="session-title"
                placeholder="e.g. Math revision"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="session-date" className="mb-1.5 block text-sm font-medium text-ink">Date</label>
              <input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="session-start" className="mb-1.5 block text-sm font-medium text-ink">Start</label>
                <input
                  id="session-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="session-end" className="mb-1.5 block text-sm font-medium text-ink">End</label>
                <input
                  id="session-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="session-remind" className="mb-1.5 block text-sm font-medium text-ink">Remind me</label>
            <select
              id="session-remind"
              value={remindMinutes}
              onChange={(e) => setRemindMinutes(Number(e.target.value))}
              className={inputClass}
            >
              {REMINDER_CHOICES.map((c) => (
                <option key={c.minutes} value={c.minutes}>{c.label}</option>
              ))}
            </select>
            {pushState === "off" && (
              <p className="mt-1.5 text-xs text-ink-muted">Turn on reminders below to get a notification on this device.</p>
            )}
          </div>
          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => { setAdding(false); setFormError("") }}
              className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              Cancel
            </button>
            <button
              onClick={saveSession}
              disabled={saving}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save session"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <div className={panel}>
          {/* Month nav */}
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }}
              aria-label="Previous month"
              className={navButton}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-ink">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }}
              aria-label="Next month"
              className={navButton}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS.map(d => (
              <div key={d} className="py-1 text-center text-xs font-medium uppercase text-ink-muted">{d}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = formatDate(currentYear, currentMonth, day)
              const { dayAssignments, daySessions } = getEventsForDay(day)
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const isSelected = selectedDay === dateStr
              const hasEvents = dayAssignments.length > 0 || daySessions.length > 0

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  aria-pressed={isSelected}
                  aria-label={`${MONTHS[currentMonth]} ${day}${isToday ? ", today" : ""}${hasEvents ? ", has events" : ""}`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                    isSelected
                      ? "border-accent bg-accent text-on-accent"
                      : isToday
                      ? "border-accent bg-accent-tint font-semibold text-accent-strong"
                      : "border-transparent text-ink hover:bg-paper"
                  }`}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                      {dayAssignments.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-on-accent" : "bg-ink-muted"}`} />}
                      {daySessions.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-on-accent" : "bg-accent"}`} />}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex gap-5 border-t border-line pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink-muted" aria-hidden="true" />
              Assignment due
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Study session
            </div>
          </div>
        </div>

        {/* Events panel */}
        <div className="flex flex-col gap-6">
          {/* Next study session */}
          <div className={panel}>
            <h2 className="mb-3 text-lg font-semibold text-ink">Next study session</h2>
            {nextSession ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-strong">
                  <Clock size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{nextSession.session.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {fmtDate(nextSession.start, { year: false })} · {nextSession.session.start_time}
                  </p>
                  <p className="mt-1 text-xs font-medium text-accent-strong">Starts {untilText(nextSession.start, now)}</p>
                </div>
              </div>
            ) : (
              <p className="py-2 text-sm text-ink-muted">Nothing planned. Add a study session to get started.</p>
            )}
          </div>

          {/* Reminders */}
          <div className={panel}>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
              {pushState === "on" ? <Bell size={18} aria-hidden="true" className="text-accent" /> : <BellOff size={18} aria-hidden="true" className="text-ink-muted" />}
              Reminders
            </h2>
            {pushState === "loading" && <p className="text-sm text-ink-muted">Checking...</p>}
            {pushState === "unsupported" && (
              <p className="text-sm leading-relaxed text-ink-muted">
                This browser can&apos;t send reminders. On iPhone, add Lunara to your Home Screen first, then open it from there.
              </p>
            )}
            {pushState === "denied" && (
              <p className="text-sm leading-relaxed text-ink-muted">
                Notifications are blocked for Lunara. Allow them in your browser&apos;s site settings, then come back here.
              </p>
            )}
            {pushState === "off" && (
              <>
                <p className="text-sm leading-relaxed text-ink-muted">Get a notification on this device before each study session starts.</p>
                <button
                  onClick={turnOnReminders}
                  disabled={pushBusy}
                  className="mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pushBusy ? "Turning on..." : "Turn on reminders"}
                </button>
              </>
            )}
            {pushState === "on" && (
              <>
                <p className="text-sm leading-relaxed text-ink-muted">Reminders are on for this device.</p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={testReminder}
                    disabled={pushBusy}
                    className="flex-1 rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
                  >
                    Send a test
                  </button>
                  <button
                    onClick={turnOffReminders}
                    disabled={pushBusy}
                    className="flex-1 rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-60"
                  >
                    Turn off
                  </button>
                </div>
              </>
            )}
            {pushMessage && <p role="status" className="mt-3 text-xs text-ink-muted">{pushMessage}</p>}
          </div>

          {selectedDay ? (
            <div className={panel}>
              <h2 className="mb-4 text-lg font-semibold text-ink">
                {formatDateLong(selectedDay)}
              </h2>

              {selectedEvents?.dayAssignments.length === 0 && selectedEvents?.daySessions.length === 0 && (
                <p className="py-4 text-center text-sm text-ink-muted">Nothing scheduled</p>
              )}

              <div className="space-y-2.5">
                {selectedEvents?.dayAssignments.map(a => (
                  <div key={a.id} className="rounded-lg border border-line bg-paper px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ink-muted" aria-hidden="true" />
                      <p className={`text-sm font-medium ${a.completed ? "text-ink-muted line-through" : "text-ink"}`}>{a.title}</p>
                    </div>
                    <p className="ml-4 mt-0.5 text-xs text-ink-muted">Assignment due</p>
                  </div>
                ))}

                {selectedEvents?.daySessions.map(s => (
                  <div key={s.id} className="rounded-lg border border-line bg-accent-tint px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                          <p className="text-sm font-medium text-ink">{s.title}</p>
                        </div>
                        <p className="ml-4 mt-0.5 text-xs text-ink-muted">{s.start_time} – {s.end_time}</p>
                        <p className="ml-4 mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <Bell size={12} aria-hidden="true" />
                          {REMINDER_CHOICES.find((c) => c.minutes === (s.remind_minutes ?? 15))?.label ?? `${s.remind_minutes} minutes before`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSession(s.id)}
                        aria-label={`Delete ${s.title}`}
                        className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`${panel} flex flex-col items-center text-center`}>
              <CalendarDays size={24} aria-hidden="true" className="text-ink-muted" />
              <p className="mt-2 text-sm text-ink-muted">Select a day to see its events</p>
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className={panel}>
            <h2 className="mb-3 text-lg font-semibold text-ink">Upcoming deadlines</h2>
            {pendingAssignments.length === 0 ? (
              <p className="py-3 text-center text-sm text-ink-muted">No pending assignments</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...pendingAssignments].sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5).map(a => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="min-w-0 truncate text-sm text-ink">{a.title}</p>
                    <span className="shrink-0 rounded-md bg-accent-tint px-2 py-0.5 text-xs font-medium tabular-nums text-accent-strong">{fmtDate(a.due_date, { weekday: false })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
