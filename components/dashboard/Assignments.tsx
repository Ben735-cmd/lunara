"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CalendarCheck, Check, ClipboardList, Plus, Search, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { AssignmentsSkeleton } from "../ui/Skeleton"

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [userId, setUserId] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all")
  const [searchQuery, setSearchQuery] = useState("")

  async function fetchAssignments() {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
    setAssignments(data || [])
    setLoaded(true)
  }

  useEffect(() => { fetchAssignments() }, [])

  async function addAssignment() {
    if (!title || !dueDate) return
    setSaving(true)
    const { error } = await supabase.from("assignments").insert([{
      title, due_date: dueDate, completed: false, user_id: userId,
    }])
    if (error) { alert(error.message); setSaving(false); return }
    setTitle(""); setDueDate(""); setAdding(false); setSaving(false)
    fetchAssignments()
  }

  async function toggleAssignment(id: string, completed: boolean) {
    await supabase.from("assignments").update({ completed: !completed }).eq("id", id)
    fetchAssignments()
  }

  async function deleteAssignment(id: string) {
    await supabase.from("assignments").delete().eq("id", id)
    fetchAssignments()
  }

  function getDaysUntilDue(dueDate: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate + "T00:00:00")
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Badge colors come from the design tokens: danger for overdue, accent for
  // anything done or close, and the neutral line color for the rest.
  function getDueBadge(dueDate: string, completed: boolean) {
    if (completed) return { label: "Completed", className: "bg-accent-tint text-accent-strong" }
    const days = getDaysUntilDue(dueDate)
    if (days < 0) return { label: "Overdue", className: "bg-danger-tint text-danger" }
    if (days === 0) return { label: "Due today", className: "bg-accent text-on-accent" }
    if (days === 1) return { label: "Due tomorrow", className: "bg-accent text-on-accent" }
    if (days <= 7) return { label: `${days} days left`, className: "bg-accent-tint text-accent-strong" }
    return { label: `${days} days left`, className: "border border-line text-ink-muted" }
  }

  const filtered = assignments
    .filter(a => filter === "all" ? true : filter === "pending" ? !a.completed : a.completed)
    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const pending = assignments.filter(a => !a.completed)
  const completed = assignments.filter(a => a.completed)
  const overdue = assignments.filter(a => !a.completed && getDaysUntilDue(a.due_date) < 0)

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  const stats = [
    { label: "Total", value: assignments.length, Icon: ClipboardList },
    { label: "Pending", value: pending.length, Icon: CalendarCheck },
    { label: "Completed", value: completed.length, Icon: Check },
  ]

  if (!loaded) return <AssignmentsSkeleton />

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Assignments</h1>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
        >
          <Plus size={16} aria-hidden="true" /> New assignment
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="bg-surface p-5">
            <div className="flex items-center justify-between text-ink-muted">
              <p className="text-sm">{label}</p>
              <Icon size={18} aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Overdue warning */}
      {overdue.length > 0 && (
        <div role="alert" className="mt-6 flex items-center gap-3 rounded-lg bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
          <AlertTriangle size={18} aria-hidden="true" />
          You have {overdue.length} overdue assignment{overdue.length > 1 ? "s" : ""}.
        </div>
      )}

      {/* Add assignment form */}
      {adding && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">New assignment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="assignment-title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
              <input
                id="assignment-title"
                type="text"
                placeholder="Assignment title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="assignment-due" className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
              <input
                id="assignment-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={() => { setAdding(false); setTitle(""); setDueDate("") }}
                className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={addAssignment}
                disabled={saving}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            aria-label="Search assignments"
            placeholder="Search assignments"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1" role="group" aria-label="Filter assignments">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f ? "bg-accent-tint text-accent-strong" : "text-ink-muted hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments list */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium text-ink">
              {filter === "completed" ? "No completed assignments yet" : filter === "pending" ? "No pending assignments" : "No assignments yet"}
            </p>
            <p className="mt-1.5 text-sm text-ink-muted">
              {filter === "pending" ? "You're all caught up." : "Choose New assignment to add one."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((assignment) => {
              const badge = getDueBadge(assignment.due_date, assignment.completed)

              return (
                <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <button
                      onClick={() => toggleAssignment(assignment.id, assignment.completed)}
                      role="checkbox"
                      aria-checked={assignment.completed}
                      aria-label={`Mark ${assignment.title} as ${assignment.completed ? "not done" : "done"}`}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        assignment.completed
                          ? "border-accent bg-accent text-on-accent"
                          : "border-line hover:border-accent"
                      }`}
                    >
                      {assignment.completed && <Check size={14} aria-hidden="true" />}
                    </button>

                    <div className="min-w-0">
                      <p className={`truncate font-medium ${assignment.completed ? "text-ink-muted line-through" : "text-ink"}`}>
                        {assignment.title}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Due {new Date(assignment.due_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      aria-label={`Delete ${assignment.title}`}
                      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
