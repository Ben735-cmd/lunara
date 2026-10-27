"use client"
import AITest from "../ai/AITest"
import { useEffect, useState } from "react"
import { BookOpen, ClipboardList, Flame, Search, Trash2, TrendingUp, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import Sidebar from "../layout/Sidebar"
import AddCourseModal from "./AddCourseModal"
import AddAssignmentModal from "./AddAssignmentModal"
import CourseViewer from "./CourseViewer"
import Notes from "./Notes"
import Calendar from "./Calendar"
import QuestionSolver from "./QuestionSolver"
import PastPapers from "./PastPapers"
import Assignments from "./Assignments"
import ProfileCenter from "./ProfileCenter"
import { DashboardLoading } from "../ui/Skeleton"

type Props = {
  email: string
  logout: () => void
}

type Course = {
  id: string
  title: string
  code: string
  progress: number
}

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
}

export default function Dashboard({ email, logout }: Props) {
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [userId, setUserId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [isDark, setIsDark] = useState(false)
  const [studyStreak, setStudyStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null)

  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  async function fetchCourses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data, error } = await supabase.from("courses").select("*").eq("user_id", user.id)
    if (error) {
      console.error(error)
      showToast("Couldn't load your courses. Please try again.")
      return
    }
    setCourses(data || [])
  }

  async function fetchAssignments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from("assignments").select("*").eq("user_id", user.id)
    if (error) {
      console.error(error)
      showToast("Couldn't load your assignments. Please try again.")
      return
    }
    setAssignments(data || [])
  }

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      await Promise.all([fetchCourses(), fetchAssignments()])
      setLoading(false)
    }
    loadInitialData()
  }, [])

  async function increaseProgress(id: string, progress: number) {
    const { error } = await supabase.from("courses").update({ progress: progress + 10 }).eq("id", id)
    if (error) {
      console.error(error)
      showToast("Couldn't update progress. Please try again.")
      return
    }
    fetchCourses()
  }

  async function deleteCourse(id: string) {
    const { error } = await supabase.from("courses").delete().eq("id", id)
    if (error) {
      console.error(error)
      showToast("Couldn't delete the course. Please try again.")
      return
    }
    fetchCourses()
  }

  async function toggleAssignment(id: string, completed: boolean) {
    const { error } = await supabase.from("assignments").update({ completed: !completed }).eq("id", id)
    if (error) {
      console.error(error)
      showToast("Couldn't update the assignment. Please try again.")
      return
    }
    fetchAssignments()
  }

  async function deleteAssignment(id: string) {
    const { error } = await supabase.from("assignments").delete().eq("id", id)
    if (error) {
      console.error(error)
      showToast("Couldn't delete the assignment. Please try again.")
      return
    }
    fetchAssignments()
  }

  const productivity =
    assignments.length === 0
      ? 0
      : Math.round(
          (assignments.filter((a) => a.completed).length / assignments.length) * 100
        )

  const query = searchQuery.toLowerCase()
  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
  )
  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(query)
  )

  if (loading) {
    return <DashboardLoading dark={isDark} />
  }

  const stats = [
    { label: "Courses", value: courses.length, Icon: BookOpen },
    { label: "Assignments", value: assignments.length, Icon: ClipboardList },
    { label: "Productivity", value: `${productivity}%`, Icon: TrendingUp },
    { label: "Study streak", value: studyStreak, Icon: Flame },
  ]

  const panel = "rounded-xl border border-line bg-surface"
  const smallButton =
    "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper"

  return (
    <main className={`${isDark ? "dark" : ""} flex min-h-screen bg-paper text-ink`}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .toast { animation: toastIn 0.2s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }
      `}</style>

      {toast && (
        <div
          role="status"
          className={`toast fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-on-accent ${
            toast.type === "error" ? "bg-danger" : "bg-accent"
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-on-accent/80 hover:text-on-accent"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Sidebar
        logout={logout}
        onSelectCourse={(id) => {
          setSelectedCourseId(id || null)
          if (id) setActiveNav("Courses")
        }}
        selectedCourseId={selectedCourseId}
        activeNav={activeNav}
        setActiveNav={(nav) => {
          setActiveNav(nav)
          if (nav !== "Courses") setSelectedCourseId(null)
        }}
      />

      {selectedCourseId ? (
        <CourseViewer
          courseId={selectedCourseId}
          onBack={() => {
            setSelectedCourseId(null)
            fetchCourses()
          }}
        />
      ) : activeNav === "Assignments" ? (
        <Assignments />
      ) : activeNav === "Notes" ? (
        <Notes />
      ) : activeNav === "Calendar" ? (
        <Calendar />
      ) : activeNav === "Past papers" ? (
        <PastPapers />
      ) : activeNav === "Solver" ? (
        <QuestionSolver />
      ) : (
        // pt-[88px] on mobile clears the fixed menu button from the Sidebar
        <section className="w-full flex-1 overflow-y-auto bg-paper px-5 pb-8 pt-[88px] md:px-12 md:py-11">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>

            <div className="flex w-full items-center gap-3 md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  aria-label="Search courses and tasks"
                  placeholder="Search courses and tasks"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 md:w-[280px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <ProfileCenter
                email={email}
                isDark={isDark}
                onThemeChange={(dark) => setIsDark(dark)}
                onStreakUpdate={(streak) => setStudyStreak(streak)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
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

          {/* Main Grid */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">

            {/* Courses Panel */}
            <div className={`${panel} p-6`}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-ink">Courses</h2>
                <AddCourseModal userId={userId} refreshCourses={fetchCourses} />
              </div>

              <div className="divide-y divide-line">
                {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className="-mx-3 cursor-pointer rounded-lg px-3 py-4 transition-colors hover:bg-paper"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCourseId(course.id) }}
                          className="block max-w-full truncate text-left font-medium text-ink hover:text-accent-strong"
                        >
                          {course.title}
                        </button>
                        <p className="mt-0.5 text-sm text-ink-muted">{course.code}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCourse(course.id) }}
                        aria-label={`Delete ${course.title}`}
                        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-valuenow={course.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${course.title} progress`}
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                      >
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-300"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm tabular-nums text-ink-muted">{course.progress}%</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); increaseProgress(course.id, course.progress) }}
                        className={smallButton}
                      >
                        Add 10%
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="py-10 text-center text-sm text-ink-muted">
                    {courses.length === 0
                      ? "No courses yet. Add one to start studying."
                      : "No courses match your search."}
                  </p>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className={`${panel} h-fit p-6`}>
              <h2 className="mb-4 text-lg font-semibold text-ink">Upcoming tasks</h2>
              <AddAssignmentModal userId={userId} refreshAssignments={fetchAssignments} />
              <div className="mt-4 divide-y divide-line">
                {filteredAssignments.length > 0 ? filteredAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${assignment.completed ? "text-ink-muted line-through" : "text-ink"}`}>
                        {assignment.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">Due {assignment.due_date}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => toggleAssignment(assignment.id, assignment.completed)}
                        className={smallButton}
                      >
                        {assignment.completed ? "Undo" : "Done"}
                      </button>
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        aria-label={`Delete ${assignment.title}`}
                        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-sm text-ink-muted">
                    {assignments.length === 0 ? "No tasks yet." : "No tasks match your search."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <AITest />
          </div>

        </section>
      )}
    </main>
  )
}
