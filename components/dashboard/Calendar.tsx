"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { CalendarSkeleton } from "../ui/Skeleton"

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

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)

    const { data: aData } = await supabase.from("assignments").select("*").eq("user_id", user.id)
    setAssignments(aData || [])

    const { data: sData } = await supabase.from("study_sessions").select("*").eq("user_id", user.id)
    setSessions(sData || [])
    setLoaded(true)
  }

  useEffect(() => { fetchData() }, [])

  async function saveSession() {
    if (!sessionTitle || !sessionDate || !startTime || !endTime) return
    setSaving(true)
    await supabase.from("study_sessions").insert([{
      title: sessionTitle, date: sessionDate,
      start_time: startTime, end_time: endTime, user_id: userId,
    }])
    setSessionTitle(""); setSessionDate(""); setStartTime(""); setEndTime("")
    setAdding(false); setSaving(false)
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
    daySessions: sessions.filter(s => s.date === selectedDay),
  } : null

  const panel = "rounded-xl border border-line bg-surface p-6"
  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
  const navButton =
    "rounded-lg border border-line p-2 text-ink-muted transition-colors hover:bg-paper hover:text-ink"

  const pendingAssignments = assignments.filter(a => !a.completed)

  if (!loaded) return <CalendarSkeleton />

  return (
    <section className="w-full flex-1 overflow-y-auto bg-paper px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Calendar</h1>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
        >
          <Plus size={16} aria-hidden="true" /> Study session
        </button>
      </div>

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
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setAdding(false)}
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
          {selectedDay ? (
            <div className={panel}>
              <h2 className="mb-4 text-lg font-semibold text-ink">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
                    <span className="shrink-0 rounded-md bg-accent-tint px-2 py-0.5 text-xs font-medium tabular-nums text-accent-strong">{a.due_date}</span>
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
