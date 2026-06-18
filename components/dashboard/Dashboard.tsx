"use client"
import AITest from "../ai/AITest"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Sidebar from "../layout/Sidebar"
import AddCourseModal from "./AddCourseModal"
import AddAssignmentModal from "./AddAssignmentModal"
import CourseViewer from "./CourseViewer"
import Notes from "./Notes"
import Calendar from "./Calendar"
import QuestionSolver from "./QuestionSolver"
import Assignments from "./Assignments"
import ProfileCenter from "./ProfileCenter"

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

  async function fetchCourses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from("courses").select("*").eq("user_id", user.id)
    setCourses(data || [])
  }

  async function fetchAssignments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("assignments").select("*").eq("user_id", user.id)
    setAssignments(data || [])
  }

  useEffect(() => {
    fetchCourses()
    fetchAssignments()
  }, [])

  async function increaseProgress(id: string, progress: number) {
    await supabase.from("courses").update({ progress: progress + 10 }).eq("id", id)
    fetchCourses()
  }

  async function deleteCourse(id: string) {
    await supabase.from("courses").delete().eq("id", id)
    fetchCourses()
  }

  async function toggleAssignment(id: string, completed: boolean) {
    await supabase.from("assignments").update({ completed: !completed }).eq("id", id)
    fetchAssignments()
  }

  async function deleteAssignment(id: string) {
    await supabase.from("assignments").delete().eq("id", id)
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

  const bg = isDark ? "#080810" : "#F0F2FF"
  const cardBg = isDark ? "#0D0D1A" : "#FFFFFF"
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9"
  const textPrimary = isDark ? "#FFFFFF" : "#0F172A"
  const textSecondary = isDark ? "#64748B" : "#94A3B8"
  const inputBg = isDark ? "#0D0D1A" : "#FFFFFF"
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"

  return (
    <main style={{ minHeight: "100vh", background: bg, display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(139,92,246,0.12) !important; border-color: rgba(139,92,246,0.2) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
      `}</style>

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
      ) : activeNav === "Solver" ? (
        <QuestionSolver />
      ) : (
        <section style={{ flex: 1, padding: "44px 48px", overflowY: "auto", background: bg }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: textSecondary, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Welcome back</p>
              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "3.5rem", fontWeight: 900,
                color: textPrimary, marginTop: "6px", lineHeight: 1.1,
              }}>Hey there 👋</h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", width: 18, height: 18 }}
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search courses & tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: inputBg,
                    border: `1.5px solid ${inputBorder}`,
                    borderRadius: "16px",
                    paddingLeft: "48px",
                    paddingRight: searchQuery ? "48px" : "20px",
                    paddingTop: "13px",
                    paddingBottom: "13px",
                    width: "280px",
                    fontSize: "0.875rem",
                    color: textPrimary,
                    outline: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: "1.2rem", background: "none", border: "none", cursor: "pointer" }}
                  >×</button>
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

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "40px" }}>
            {[
              { label: "Courses", value: courses.length, icon: "📚", bg: "linear-gradient(135deg, #F97316, #EC4899)", shadow: "rgba(249,115,22,0.25)" },
              { label: "Assignments", value: assignments.length, icon: "📝", bg: "linear-gradient(135deg, #06B6D4, #3B82F6)", shadow: "rgba(6,182,212,0.25)" },
              { label: "Productivity", value: `${productivity}%`, icon: "⚡", bg: "linear-gradient(135deg, #8B5CF6, #6D28D9)", shadow: "rgba(139,92,246,0.25)" },
              { label: "Study Streak", value: studyStreak, icon: "🔥", bg: "linear-gradient(135deg, #10B981, #059669)", shadow: "rgba(16,185,129,0.25)" },
            ].map((card) => (
              <div key={card.label} style={{
                background: card.bg,
                borderRadius: "24px",
                padding: "24px 28px",
                boxShadow: `0 8px 32px ${card.shadow}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</p>
                  <span style={{ fontSize: "1.4rem" }}>{card.icon}</span>
                </div>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "2.75rem", fontWeight: 900,
                  color: "#FFFFFF", lineHeight: 1,
                }}>{card.value}</h2>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", marginTop: "28px" }}>

            {/* Courses Panel */}
            <div style={{ background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: "28px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.4rem", fontWeight: 700, color: textPrimary }}>Current Courses</h2>
                  <p style={{ color: textSecondary, fontSize: "0.82rem", marginTop: "4px" }}>Your semester modules</p>
                </div>
                <AddCourseModal userId={userId} refreshCourses={fetchCourses} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                  <div key={course.id} className="card-hover" onClick={() => setSelectedCourseId(course.id)}
                    style={{ border: `1.5px solid ${cardBorder}`, borderRadius: "20px", padding: "20px 24px", cursor: "pointer", background: isDark ? "#111128" : "#FAFBFF", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: textPrimary }}>{course.title}</h3>
                        <span style={{ display: "inline-block", marginTop: "6px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", color: "#7C3AED", borderRadius: "8px", padding: "2px 10px", fontSize: "0.72rem", fontWeight: 600 }}>{course.code}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteCourse(course.id) }}
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", borderRadius: "10px", padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
                    </div>
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: textSecondary, fontSize: "0.75rem" }}>Progress</span>
                        <span style={{ color: textPrimary, fontSize: "0.75rem", fontWeight: 700 }}>{course.progress}%</span>
                      </div>
                      <div style={{ width: "100%", height: "7px", background: isDark ? "#1E293B" : "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${course.progress}%`, background: "linear-gradient(90deg, #8B5CF6, #3B82F6)", borderRadius: "99px", transition: "width 0.3s ease" }} />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); increaseProgress(course.id, course.progress) }}
                        style={{ marginTop: "14px", background: "linear-gradient(135deg, #8B5CF6, #3B82F6)", border: "none", color: "white", borderRadius: "12px", padding: "8px 18px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(139,92,246,0.3)" }}>+ Increase Progress</button>
                    </div>
                  </div>
                )) : (
                  <p style={{ color: isDark ? "#334155" : "#CBD5E1", textAlign: "center", padding: "40px 0", fontSize: "0.875rem" }}>No courses match your search.</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: "28px", padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: textPrimary, marginBottom: "16px" }}>Upcoming Tasks</h2>
                <AddAssignmentModal userId={userId} refreshAssignments={fetchAssignments} />
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  {filteredAssignments.length > 0 ? filteredAssignments.map((assignment) => (
                    <div key={assignment.id} style={{ border: `1.5px solid ${cardBorder}`, borderRadius: "16px", padding: "14px 16px", background: isDark ? "#111128" : "#FAFBFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: "0.875rem", color: assignment.completed ? "#CBD5E1" : textPrimary, textDecoration: assignment.completed ? "line-through" : "none" }}>{assignment.title}</p>
                          <p style={{ fontSize: "0.75rem", color: textSecondary, marginTop: "4px" }}>Due {assignment.due_date}</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => toggleAssignment(assignment.id, assignment.completed)}
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981", borderRadius: "10px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                          >{assignment.completed ? "Undo" : "Done"}</button>
                          <button onClick={() => deleteAssignment(assignment.id)}
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", borderRadius: "10px", padding: "6px 10px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p style={{ color: isDark ? "#334155" : "#CBD5E1", textAlign: "center", padding: "20px 0", fontSize: "0.875rem" }}>No tasks match your search.</p>
                  )}
                </div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", borderRadius: "28px", padding: "28px", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>
                <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", background: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", bottom: "-20px", left: "10px", width: "70px", height: "70px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Daily Motivation</p>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.15rem", fontWeight: 700, color: "#FFFFFF", marginTop: "10px", lineHeight: 1.5, position: "relative" }}>
                  Small progress every day compounds into massive results.
                </h2>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <AITest />
          </div>

        </section>
      )}
    </main>
  )
}