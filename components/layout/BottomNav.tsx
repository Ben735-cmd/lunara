"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  BookOpen,
  Calculator,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  NotebookText,
  Timer,
  X,
  Grid2x2,
  type LucideIcon,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { useDialog } from "../../lib/useDialog"
import Logo from "../ui/Logo"

type Course = { id: string; title: string; code: string }

type Props = {
  logout: () => void
  onSelectCourse: (courseId: string) => void
  selectedCourseId: string | null
  activeNav: string
  setActiveNav: (nav: string) => void
}

// The screens that live under "More".
const MORE_ITEMS: { label: string; Icon: LucideIcon }[] = [
  { label: "Notes", Icon: NotebookText },
  { label: "Calendar", Icon: CalendarDays },
  { label: "Timetable", Icon: CalendarClock },
  { label: "Past papers", Icon: Library },
  { label: "Solver", Icon: Calculator },
]

type Sheet = "courses" | "more" | null

/** A panel that slides up from the bottom, with a dimmed backdrop. Esc, a tap outside or the X closes it. */
function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useDialog<HTMLDivElement>(true, onClose)
  return (
    <div className="anim-fade fixed inset-0 z-[55] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-surface px-5 pb-8 pt-3 shadow-2xl"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function BottomNav({ logout, onSelectCourse, selectedCourseId, activeNav, setActiveNav }: Props) {
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoaded, setCoursesLoaded] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)

  async function fetchCourses() {
    const user = await getCurrentUser()
    if (!user) { setCoursesLoaded(true); return }
    const { data } = await supabase.from("courses").select("id, title, code").eq("user_id", user.id)
    setCourses(data || [])
    setCoursesLoaded(true)
  }

  useEffect(() => {
    fetchCourses()
    const channel = supabase
      .channel("courses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => { fetchCourses() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Lock background scrolling while a sheet is open.
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [sheet])

  const inMore = MORE_ITEMS.some((m) => m.label === activeNav)
  const active =
    sheet === "courses" ? 1
    : sheet === "more" ? 4
    : selectedCourseId || activeNav === "Courses" ? 1
    : activeNav === "Assignments" ? 2
    : activeNav === "Focus" ? 3
    : inMore ? 4
    : 0

  const tabs: { label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { label: "Home", Icon: LayoutDashboard, onPress: () => { setSheet(null); setActiveNav("Dashboard"); onSelectCourse("") } },
    { label: "Courses", Icon: BookOpen, onPress: () => setSheet(sheet === "courses" ? null : "courses") },
    { label: "Tasks", Icon: ListChecks, onPress: () => { setSheet(null); setActiveNav("Assignments"); onSelectCourse("") } },
    { label: "Focus", Icon: Timer, onPress: () => { setSheet(null); setActiveNav("Focus"); onSelectCourse("") } },
    { label: "More", Icon: Grid2x2, onPress: () => setSheet(sheet === "more" ? null : "more") },
  ]

  return (
    <>
      <nav
        aria-label="Main"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto relative grid w-full max-w-md grid-cols-5 rounded-3xl border border-line/70 bg-surface/80 p-1.5 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl md:max-w-lg">
          {/* The highlight slides between tabs */}
          <span
            aria-hidden="true"
            className="nav-pill absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%-0.75rem)/5)] rounded-2xl bg-accent-tint"
            style={{ transform: `translateX(${active * 100}%)` }}
          />
          {tabs.map(({ label, Icon, onPress }, i) => {
            const isActive = i === active
            return (
              <button
                key={label}
                onClick={onPress}
                aria-current={isActive && !sheet ? "page" : undefined}
                aria-haspopup={label === "Courses" || label === "More" ? "dialog" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[0.7rem] font-semibold transition-colors ${
                  isActive ? "text-accent-strong" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={22} aria-hidden="true" className={`transition-transform duration-300 ${isActive ? "-translate-y-0.5 scale-110" : ""}`} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      {sheet === "courses" && (
        <BottomSheet title="Your courses" onClose={() => setSheet(null)}>
          {!coursesLoaded ? (
            <div role="status" aria-busy="true" aria-label="Loading courses" className="h-24 animate-pulse rounded-xl bg-paper" />
          ) : courses.length === 0 ? (
            <p className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink-muted">
              No courses yet. Add one from the Home screen.
            </p>
          ) : (
            <ul className="stagger space-y-2">
              {courses.map((course) => (
                <li key={course.id}>
                  <button
                    onClick={() => { setSheet(null); onSelectCourse(course.id); setActiveNav("Courses") }}
                    aria-current={selectedCourseId === course.id ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedCourseId === course.id ? "border-accent bg-accent-tint" : "border-line bg-paper hover:border-accent"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-strong">
                      <BookOpen size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{course.title}</span>
                      <span className="block text-xs text-ink-muted">{course.code}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BottomSheet>
      )}

      {sheet === "more" && (
        <BottomSheet title="More" onClose={() => setSheet(null)}>
          <ul className="stagger grid grid-cols-3 gap-3">
            {MORE_ITEMS.map(({ label, Icon }) => (
              <li key={label}>
                <button
                  onClick={() => { setSheet(null); setActiveNav(label); onSelectCourse("") }}
                  aria-current={activeNav === label ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-sm font-medium transition-colors ${
                    activeNav === label ? "border-accent bg-accent-tint text-accent-strong" : "border-line bg-paper text-ink hover:border-accent"
                  }`}
                >
                  <Icon size={24} aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <Logo size={28} />
            <nav aria-label="About" className="flex items-center gap-4 text-sm text-ink-muted">
              <Link href="/about" className="hover:text-ink">About</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            </nav>
          </div>
          <button
            onClick={() => { setSheet(null); logout() }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink hover:bg-paper"
          >
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
        </BottomSheet>
      )}
    </>
  )
}
