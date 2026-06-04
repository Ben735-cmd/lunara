"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

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
    if (!user) return
    setUserId(user.id)

    const { data: aData } = await supabase.from("assignments").select("*").eq("user_id", user.id)
    setAssignments(aData || [])

    const { data: sData } = await supabase.from("study_sessions").select("*").eq("user_id", user.id)
    setSessions(sData || [])
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

  return (
    <main style={{ flex: 1, background: "#F0F2FF", padding: "44px 48px", overflowY: "auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <p style={{ color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your schedule</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.5rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>Calendar 📅</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
            border: "none", borderRadius: "16px",
            padding: "12px 24px", color: "white",
            fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
          }}
        >+ Study Session</button>
      </div>

      {/* Add Session Form */}
      {adding && (
        <div style={{
          background: "white", borderRadius: "24px",
          padding: "28px", marginBottom: "24px",
          boxShadow: "0 8px 32px rgba(139,92,246,0.1)",
          border: "1.5px solid rgba(139,92,246,0.2)",
        }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", marginBottom: "16px" }}>New Study Session</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input
              placeholder="Session title (e.g. Math revision)"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              style={{ gridColumn: "1 / -1", border: "1.5px solid #E2E8F0", borderRadius: "12px", padding: "12px 16px", fontSize: "0.9rem", outline: "none", color: "#0F172A" }}
            />
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={{ border: "1.5px solid #E2E8F0", borderRadius: "12px", padding: "12px 16px", fontSize: "0.9rem", outline: "none", color: "#0F172A" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: "12px", padding: "12px 16px", fontSize: "0.9rem", outline: "none", color: "#0F172A" }}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: "12px", padding: "12px 16px", fontSize: "0.9rem", outline: "none", color: "#0F172A" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={() => setAdding(false)}
              style={{ flex: 1, background: "#F1F5F9", border: "none", borderRadius: "12px", padding: "12px", color: "#64748B", fontWeight: 600, cursor: "pointer" }}
            >Cancel</button>
            <button
              onClick={saveSession}
              disabled={saving}
              style={{ flex: 2, background: "linear-gradient(135deg, #8B5CF6, #3B82F6)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
            >{saving ? "Saving..." : "Save Session"}</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>

        {/* Calendar Grid */}
        <div style={{ background: "white", borderRadius: "28px", padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1.5px solid #F1F5F9" }}>
          {/* Month Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <button
              onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }}
              style={{ background: "#F1F5F9", border: "none", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "#64748B", fontWeight: 600 }}
            >‹</button>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", fontSize: "1.1rem" }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }}
              style={{ background: "#F1F5F9", border: "none", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "#64748B", fontWeight: 600 }}
            >›</button>
          </div>

          {/* Day Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", padding: "4px 0", textTransform: "uppercase" }}>{d}</div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = formatDate(currentYear, currentMonth, day)
              const { dayAssignments, daySessions } = getEventsForDay(day)
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const isSelected = selectedDay === dateStr
              const hasEvents = dayAssignments.length > 0 || daySessions.length > 0

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    background: isSelected
                      ? "linear-gradient(135deg, #8B5CF6, #3B82F6)"
                      : isToday
                      ? "rgba(139,92,246,0.1)"
                      : "transparent",
                    border: isToday && !isSelected ? "1.5px solid rgba(139,92,246,0.3)" : "1.5px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    fontSize: "0.85rem", fontWeight: isToday ? 700 : 500,
                    color: isSelected ? "white" : isToday ? "#7C3AED" : "#334155",
                  }}>{day}</span>
                  {hasEvents && (
                    <div style={{ display: "flex", gap: "3px", marginTop: "3px" }}>
                      {dayAssignments.length > 0 && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: isSelected ? "white" : "#F97316" }} />}
                      {daySessions.length > 0 && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: isSelected ? "white" : "#8B5CF6" }} />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "20px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F97316" }} />
              <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Assignment due</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8B5CF6" }} />
              <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Study session</span>
            </div>
          </div>
        </div>

        {/* Events Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedDay ? (
            <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1.5px solid #F1F5F9" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", marginBottom: "16px" }}>
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>

              {selectedEvents?.dayAssignments.length === 0 && selectedEvents?.daySessions.length === 0 && (
                <p style={{ color: "#CBD5E1", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>Nothing scheduled</p>
              )}

              {selectedEvents?.dayAssignments.map(a => (
                <div key={a.id} style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: "14px", padding: "14px 16px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F97316", flexShrink: 0 }} />
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A", textDecoration: a.completed ? "line-through" : "none" }}>{a.title}</p>
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "0.75rem", marginTop: "4px", marginLeft: "16px" }}>Assignment due</p>
                </div>
              ))}

              {selectedEvents?.daySessions.map(s => (
                <div key={s.id} style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "14px", padding: "14px 16px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8B5CF6", flexShrink: 0 }} />
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A" }}>{s.title}</p>
                      </div>
                      <p style={{ color: "#94A3B8", fontSize: "0.75rem", marginTop: "4px", marginLeft: "16px" }}>{s.start_time} – {s.end_time}</p>
                    </div>
                    <button
                      onClick={() => deleteSession(s.id)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", borderRadius: "8px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1.5px solid #F1F5F9", textAlign: "center" }}>
              <p style={{ fontSize: "2rem", marginBottom: "12px" }}>📅</p>
              <p style={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.9rem" }}>Click a day to see events</p>
            </div>
          )}

          {/* Upcoming assignments */}
          <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1.5px solid #F1F5F9" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", marginBottom: "16px", fontSize: "1rem" }}>Upcoming Deadlines</h3>
            {assignments.filter(a => !a.completed).length === 0 ? (
              <p style={{ color: "#CBD5E1", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No pending assignments</p>
            ) : (
              assignments.filter(a => !a.completed).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5).map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <p style={{ fontWeight: 500, fontSize: "0.85rem", color: "#334155" }}>{a.title}</p>
                  <span style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", borderRadius: "8px", padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>{a.due_date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}