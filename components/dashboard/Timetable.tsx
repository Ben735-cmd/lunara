"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock, MapPin, Plus, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import {
  CLASS_REMINDERS,
  DAY_LONG,
  DAY_SHORT,
  WEEK_ORDER,
  hhmm,
  isOngoing,
  localTimeZone,
  nextClass,
  overlaps,
  sortByStart,
  untilText,
  type ClassRow,
} from "../../lib/timetable"
import ReminderCard from "../ui/ReminderCard"
import PageHeader from "../ui/PageHeader"

const panel = "rounded-xl border border-line bg-surface p-6"
const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

export default function Timetable() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [userId, setUserId] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [remind, setRemind] = useState(10)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)
    const { data, error } = await supabase.from("timetable_classes").select("*").eq("user_id", user.id)
    setLoadFailed(!!error)
    setClasses((data ?? []) as ClassRow[])
    setLoaded(true)
  }

  useEffect(() => { load() }, [])
  // Keeps "Now" and "next class in..." fresh while the page is open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<number, ClassRow[]>()
    for (const d of WEEK_ORDER) map.set(d, [])
    for (const c of classes) map.get(c.day_of_week)?.push(c)
    for (const list of map.values()) list.sort(sortByStart)
    return map
  }, [classes])

  const next = useMemo(() => nextClass(classes, now), [classes, now])

  function openNew() {
    setEditingId(null)
    setTitle("")
    setLocation("")
    setDays([])
    setStart("")
    setEnd("")
    setRemind(10)
    setFormError("")
    setConfirmDelete(false)
    setFormOpen(true)
  }

  function openEdit(c: ClassRow) {
    setEditingId(c.id)
    setTitle(c.title)
    setLocation(c.location ?? "")
    setDays([c.day_of_week])
    setStart(hhmm(c.start_time))
    setEnd(hhmm(c.end_time))
    setRemind(c.remind_minutes)
    setFormError("")
    setConfirmDelete(false)
    setFormOpen(true)
    window.scrollTo?.({ top: 0 })
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setFormError("")
    setConfirmDelete(false)
  }

  function toggleDay(d: number) {
    // Adding a class can repeat on several days; editing moves one class to one day.
    if (editingId) { setDays([d]); return }
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  /** Classes the draft would clash with on the chosen days (a warning, not a block). */
  const clashes = useMemo(() => {
    if (!start || !end || end <= start || days.length === 0) return []
    return classes.filter(
      (c) => c.id !== editingId && days.includes(c.day_of_week) && overlaps(c, { start_time: start, end_time: end })
    )
  }, [classes, days, start, end, editingId])

  async function save() {
    if (!title.trim() || days.length === 0 || !start || !end) {
      setFormError("Fill in the class name, at least one day, and the start and end time.")
      return
    }
    if (end <= start) {
      setFormError("The end time must be after the start time.")
      return
    }
    setSaving(true)
    setFormError("")
    const fields = {
      title: title.trim(),
      location: location.trim() || null,
      start_time: start,
      end_time: end,
      remind_minutes: remind,
      tz: localTimeZone(),
    }
    const { error } = editingId
      ? await supabase
          .from("timetable_classes")
          .update({ ...fields, day_of_week: days[0], last_notified_on: null })
          .eq("id", editingId)
      : await supabase
          .from("timetable_classes")
          .insert(days.map((d) => ({ ...fields, user_id: userId, day_of_week: d })))
    setSaving(false)
    if (error) {
      setFormError("Could not save the class. Check your connection and try again.")
      return
    }
    closeForm()
    load()
  }

  async function remove() {
    if (!editingId) return
    setSaving(true)
    const { error } = await supabase.from("timetable_classes").delete().eq("id", editingId)
    setSaving(false)
    if (error) {
      setFormError("Could not delete the class. Try again.")
      return
    }
    closeForm()
    load()
  }

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      <PageHeader
        title="Timetable"
        subtitle="Add your weekly classes once. Lunara reminds you before each one starts, every week."
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Plus size={16} aria-hidden="true" /> Add class
          </button>
        }
      />

      {formOpen && (
        <div className={`${panel} mt-8`}>
          <h2 className="mb-4 text-lg font-semibold text-ink">{editingId ? "Edit class" : "New class"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="class-title" className="mb-1.5 block text-sm font-medium text-ink">Class</label>
              <input
                id="class-title"
                type="text"
                placeholder="e.g. Computer Networks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="class-location" className="mb-1.5 block text-sm font-medium text-ink">Room or venue (optional)</label>
              <input
                id="class-location"
                type="text"
                placeholder="e.g. Lecture Theatre 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-medium text-ink">
              {editingId ? "Day" : "Days (pick every day this class meets)"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {WEEK_ORDER.map((d) => {
                const on = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    aria-pressed={on}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                      on ? "border-accent bg-accent-tint text-accent-strong" : "border-line bg-surface text-ink-muted hover:bg-paper"
                    }`}
                  >
                    {DAY_SHORT[d]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="class-start" className="mb-1.5 block text-sm font-medium text-ink">Starts</label>
              <input id="class-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="class-end" className="mb-1.5 block text-sm font-medium text-ink">Ends</label>
              <input id="class-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="class-remind" className="mb-1.5 block text-sm font-medium text-ink">Remind me</label>
              <select id="class-remind" value={remind} onChange={(e) => setRemind(Number(e.target.value))} className={inputClass}>
                {CLASS_REMINDERS.map((c) => (
                  <option key={c.minutes} value={c.minutes}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {clashes.length > 0 && (
            <p role="status" className="mt-4 rounded-lg bg-accent-tint px-3.5 py-2.5 text-sm text-ink">
              Heads up: this overlaps with {clashes.map((c) => `${c.title} (${DAY_SHORT[c.day_of_week]} ${hhmm(c.start_time)})`).join(", ")}.
            </p>
          )}
          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={closeForm}
              className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper sm:flex-none sm:px-6"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : days.length > 1 ? `Add to ${days.length} days` : "Add class"}
            </button>
            {editingId && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger sm:ml-auto"
              >
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
            )}
            {editingId && confirmDelete && (
              <div className="flex w-full items-center gap-3 rounded-lg border border-danger/40 bg-danger-tint px-4 py-2.5 sm:ml-auto sm:w-auto">
                <span className="text-sm text-ink">Delete this class?</span>
                <button onClick={remove} disabled={saving} className="text-sm font-semibold text-danger disabled:opacity-60">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm font-medium text-ink-muted">Keep</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6 max-lg:order-2">
          {loadFailed && (
            <p role="alert" className="rounded-lg bg-danger-tint px-3.5 py-3 text-sm text-danger">
              Could not load your timetable. Please try again later.
            </p>
          )}

          {!loaded ? (
            <div role="status" aria-busy="true" aria-label="Loading timetable" className={`${panel} h-48 animate-pulse`} />
          ) : classes.length === 0 ? (
            <div className={`${panel} px-6 py-14 text-center`}>
              <Clock size={28} aria-hidden="true" className="mx-auto text-accent" />
              <p className="mt-3 font-medium text-ink">No classes yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
                Add the classes you attend each week and Lunara will remind you before they start.
              </p>
              <button
                onClick={openNew}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
              >
                <Plus size={16} aria-hidden="true" /> Add your first class
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-7">
              {WEEK_ORDER.map((d) => {
                const list = byDay.get(d) ?? []
                const isToday = d === now.getDay()
                return (
                  <section
                    key={d}
                    aria-label={DAY_LONG[d]}
                    className={`rounded-xl border bg-surface p-4 ${isToday ? "border-accent" : "border-line"}`}
                  >
                    <h2 className={`flex items-center justify-between text-sm font-semibold ${isToday ? "text-accent-strong" : "text-ink"}`}>
                      <span className="2xl:hidden">{DAY_LONG[d]}</span>
                      <span className="hidden 2xl:inline">{DAY_SHORT[d]}</span>
                      {isToday && <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[0.7rem] font-medium">Today</span>}
                    </h2>
                    {list.length === 0 ? (
                      <p className="mt-3 text-xs text-ink-muted">No classes</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {list.map((c) => {
                          const live = isOngoing(c, now)
                          return (
                            <li key={c.id}>
                              <button
                                onClick={() => openEdit(c)}
                                aria-label={`Edit ${c.title}, ${DAY_LONG[c.day_of_week]} ${hhmm(c.start_time)}`}
                                className={`w-full rounded-lg border p-3 text-left transition-colors hover:border-accent/60 ${
                                  live ? "border-accent bg-accent-tint" : "border-line bg-paper"
                                }`}
                              >
                                <p className="text-xs font-medium tabular-nums text-accent-strong">
                                  {hhmm(c.start_time)} – {hhmm(c.end_time)}
                                  {live && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] text-on-accent">Now</span>}
                                </p>
                                <p className="mt-1 break-words text-sm font-medium text-ink">{c.title}</p>
                                {c.location && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                                    <MapPin size={12} aria-hidden="true" /> {c.location}
                                  </p>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6 max-lg:contents">
          <div className={`${panel} max-lg:order-1`}>
            <h2 className="mb-3 text-lg font-semibold text-ink">Next class</h2>
            {next ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-strong">
                  <Clock size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-ink">{next.cls.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {DAY_LONG[next.cls.day_of_week]} · {hhmm(next.cls.start_time)}
                    {next.cls.location ? ` · ${next.cls.location}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-accent-strong">Starts {untilText(next.start, now)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Nothing scheduled. Add a class to see what is next.</p>
            )}
          </div>

          <div className="max-lg:order-3">
            <ReminderCard userId={userId} description="Get a notification on this device before each class starts." />
          </div>
        </div>
      </div>
    </section>
  )
}
