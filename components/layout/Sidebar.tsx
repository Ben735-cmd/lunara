"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SidebarCoursesSkeleton } from "../ui/Skeleton"
import {
  BookOpen,
  Calculator,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Library,
  Menu,
  NotebookText,
  Timer,
  type LucideIcon,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import Logo from "../ui/Logo"

type Course = {
  id: string
  title: string
  code: string
}

type SidebarProps = {
  logout: () => void
  onSelectCourse: (courseId: string) => void
  selectedCourseId: string | null
  activeNav: string
  setActiveNav: (nav: string) => void
}

const navIcons: Record<string, LucideIcon> = {
  Assignments: ListChecks,
  Notes: NotebookText,
  "Past papers": Library,
  Calendar: CalendarDays,
  Timetable: CalendarClock,
  Focus: Timer,
  Solver: Calculator,
}

const MOBILE_BREAKPOINT = 768

export default function Sidebar({ logout, onSelectCourse, selectedCourseId, activeNav, setActiveNav }: SidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [coursesLoaded, setCoursesLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function fetchCourses() {
    const user = await getCurrentUser()
    if (!user) { setCoursesLoaded(true); return }
    const { data } = await supabase
      .from("courses")
      .select("id, title, code")
      .eq("user_id", user.id)
    setCourses(data || [])
    setCoursesLoaded(true)
  }

  useEffect(() => {
    fetchCourses()
    const channel = supabase
      .channel("courses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => {
        fetchCourses()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Track viewport width so the sidebar can switch between a static column
  // (desktop) and an off-canvas drawer (mobile) instead of squeezing content.
  useEffect(() => {
    function checkSize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    checkSize()
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  // Lock background scroll while the mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isMobile, mobileOpen])

  function closeOnMobile() {
    if (isMobile) setMobileOpen(false)
  }

  const navItems = ["Assignments", "Notes", "Calendar", "Timetable", "Focus", "Past papers", "Solver"]

  const itemBase =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors"
  const itemIdle = "text-ink-muted hover:bg-paper hover:text-ink"
  const itemActive = "bg-accent-tint text-accent-strong"
  const dashboardActive = activeNav === "Dashboard" && !selectedCourseId

  return (
    <>
      {/* Mobile menu toggle button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className={`fixed left-4 top-4 z-[60] h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-ink ${
            mobileOpen ? "hidden" : "flex"
          }`}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Backdrop overlay, closes drawer on tap */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}

      <aside
        className={`flex min-h-screen w-[260px] flex-col justify-between border-r border-line bg-surface px-3 py-6 ${
          isMobile ? "fixed left-0 top-0 z-50 h-screen transition-transform duration-200" : ""
        } ${isMobile && !mobileOpen ? "-translate-x-full" : ""}`}
      >
        <div>
          <Logo size={32} className="mb-8 px-3" />

          <nav className="flex flex-col gap-1" aria-label="Main">
            <button
              onClick={() => { setActiveNav("Dashboard"); onSelectCourse(""); closeOnMobile() }}
              aria-current={dashboardActive ? "page" : undefined}
              className={`${itemBase} ${dashboardActive ? itemActive : itemIdle}`}
            >
              <LayoutDashboard size={18} aria-hidden="true" /> Dashboard
            </button>

            {/* Courses dropdown */}
            <div>
              <button
                onClick={() => { setCoursesOpen(!coursesOpen); setActiveNav("Courses") }}
                aria-expanded={coursesOpen}
                className={`${itemBase} justify-between ${activeNav === "Courses" ? itemActive : itemIdle}`}
              >
                <span className="flex items-center gap-3">
                  <BookOpen size={18} aria-hidden="true" /> Courses
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${coursesOpen ? "rotate-180" : ""}`}
                />
              </button>

              {coursesOpen && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-line pl-2">
                  {!coursesLoaded ? (
                    <SidebarCoursesSkeleton />
                  ) : courses.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-ink-muted">No courses yet</p>
                  ) : (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => { onSelectCourse(course.id); setActiveNav("Courses"); closeOnMobile() }}
                        aria-current={selectedCourseId === course.id ? "page" : undefined}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                          selectedCourseId === course.id ? itemActive : itemIdle
                        }`}
                      >
                        <p className="truncate text-[0.8rem] font-medium">{course.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{course.code}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {navItems.map((item) => {
              const Icon = navIcons[item]
              return (
                <button
                  key={item}
                  onClick={() => { setActiveNav(item); onSelectCourse(""); closeOnMobile() }}
                  aria-current={activeNav === item ? "page" : undefined}
                  className={`${itemBase} ${activeNav === item ? itemActive : itemIdle}`}
                >
                  <Icon size={18} aria-hidden="true" /> {item}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="mt-6">
          <button
            onClick={() => { logout(); closeOnMobile() }}
            className={`${itemBase} ${itemIdle}`}
          >
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
          <nav aria-label="About" className="mt-3 flex items-center gap-4 px-3 text-xs text-ink-muted">
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </aside>
    </>
  )
}
