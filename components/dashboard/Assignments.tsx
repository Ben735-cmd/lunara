"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [userId, setUserId] = useState("")
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all")
  const [searchQuery, setSearchQuery] = useState("")

  async function fetchAssignments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
    setAssignments(data || [])
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

  function getDueBadge(dueDate: string, completed: boolean) {
    if (completed) return { label: "Completed", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", color: "#10B981" }
    const days = getDaysUntilDue(dueDate)
    if (days < 0) return { label: "Overdue", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", color: "#EF4444" }
    if (days === 0) return { label: "Due Today", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", color: "#F97316" }
    if (days === 1) return { label: "Due Tomorrow", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.15)", color: "#F97316" }
    if (days <= 7) return { label: `${days} days left`, bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.2)", color: "#CA8A04" }
    return { label: `${days} days left`, bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.15)", color: "#7C3AED" }
  }

  const filtered = assignments
    .filter(a => filter === "all" ? true : filter === "pending" ? !a.completed : a.completed)
    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const pending = assignments.filter(a => !a.completed)
  const completed = assignments.filter(a => a.completed)
  const overdue = assignments.filter(a => !a.completed && getDaysUntilDue(a.due_date) < 0)

  return (
    <main style={{ flex: 1, background: "#F0F2FF", padding: "44px 48px", overflowY: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .assignment-card { transition: all 0.2s ease; animation: fadeIn 0.3s ease; }
        .assignment-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <p style={{ color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your work</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.5rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>Assignments ✓</h1>
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
        >+ New Assignment</button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total", value: assignments.length, icon: "📝", bg: "linear-gradient(135deg, #8B5CF6, #3B82F6)", shadow: "rgba(139,92,246,0.25)" },
          { label: "Pending", value: pending.length, icon: "⏳", bg: "linear-gradient(135deg, #F97316, #EC4899)", shadow: "rgba(249,115,22,0.25)" },
          { label: "Completed", value: completed.length, icon: "✅", bg: "linear-gradient(135deg, #10B981, #059669)", shadow: "rgba(16,185,129,0.25)" },
        ].map((card) => (
          <div key={card.label} style={{
            background: card.bg, borderRadius: "20px", padding: "20px 24px",
            boxShadow: `0 8px 24px ${card.shadow}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</p>
              <span style={{ fontSize: "1.2rem" }}>{card.icon}</span>
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.5rem", fontWeight: 900, color: "white", lineHeight: 1 }}>{card.value}</h2>
          </div>
        ))}
      </div>

      {/* Overdue Warning */}
      {overdue.length > 0 && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)",
          borderRadius: "16px", padding: "14px 20px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <p style={{ color: "#EF4444", fontWeight: 600, fontSize: "0.9rem" }}>
            You have {overdue.length} overdue assignment{overdue.length > 1 ? "s" : ""}!
          </p>
        </div>
      )}

      {/* Add Assignment Form */}
      {adding && (
        <div style={{
          background: "white", borderRadius: "24px", padding: "28px",
          marginBottom: "24px", border: "1.5px solid rgba(139,92,246,0.2)",
          boxShadow: "0 8px 32px rgba(139,92,246,0.1)",
        }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", marginBottom: "20px", fontSize: "1.1rem" }}>New Assignment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input
              type="text"
              placeholder="Assignment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                border: "1.5px solid #E2E8F0", borderRadius: "12px",
                padding: "12px 16px", fontSize: "0.9rem", outline: "none",
                color: "#0F172A", gridColumn: "1 / -1",
              }}
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                border: "1.5px solid #E2E8F0", borderRadius: "12px",
                padding: "12px 16px", fontSize: "0.9rem", outline: "none", color: "#0F172A",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setAdding(false); setTitle(""); setDueDate("") }}
                style={{ flex: 1, background: "#F1F5F9", border: "none", borderRadius: "12px", padding: "12px", color: "#64748B", fontWeight: 600, cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={addAssignment}
                disabled={saving}
                style={{ flex: 2, background: "linear-gradient(135deg, #8B5CF6, #3B82F6)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
              >{saving ? "Saving..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", width: 16, height: 16 }}
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", paddingLeft: "42px", paddingRight: "16px",
              paddingTop: "11px", paddingBottom: "11px",
              background: "white", border: "1.5px solid #E2E8F0",
              borderRadius: "14px", fontSize: "0.875rem", color: "#0F172A", outline: "none",
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", background: "white", borderRadius: "14px", padding: "4px", border: "1.5px solid #E2E8F0", gap: "4px" }}>
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px", borderRadius: "10px", border: "none",
                background: filter === f ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "transparent",
                color: filter === f ? "white" : "#94A3B8",
                fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                textTransform: "capitalize", transition: "all 0.2s",
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: "3rem", marginBottom: "12px" }}>
              {filter === "completed" ? "🎉" : "📝"}
            </p>
            <p style={{ color: "#94A3B8", fontWeight: 500 }}>
              {filter === "completed" ? "No completed assignments yet" : filter === "pending" ? "No pending assignments!" : "No assignments yet"}
            </p>
            <p style={{ color: "#CBD5E1", fontSize: "0.82rem", marginTop: "8px" }}>
              {filter === "pending" ? "Great job staying on top of things 🎉" : "Click '+ New Assignment' to add one"}
            </p>
          </div>
        ) : (
          filtered.map((assignment) => {
            const badge = getDueBadge(assignment.due_date, assignment.completed)
            const days = getDaysUntilDue(assignment.due_date)

            return (
              <div
                key={assignment.id}
                className="assignment-card"
                style={{
                  background: "white", borderRadius: "20px", padding: "20px 24px",
                  border: "1.5px solid #F1F5F9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  opacity: assignment.completed ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleAssignment(assignment.id, assignment.completed)}
                      style={{
                        width: "24px", height: "24px", borderRadius: "8px", flexShrink: 0,
                        border: assignment.completed ? "none" : "2px solid #E2E8F0",
                        background: assignment.completed ? "linear-gradient(135deg, #10B981, #059669)" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      {assignment.completed && <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>}
                    </div>

                    <div>
                      <p style={{
                        fontWeight: 600, fontSize: "0.95rem",
                        color: assignment.completed ? "#94A3B8" : "#0F172A",
                        textDecoration: assignment.completed ? "line-through" : "none",
                      }}>{assignment.title}</p>
                      <p style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: "4px" }}>
                        Due {new Date(assignment.due_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Due badge */}
                    <span style={{
                      background: badge.bg, border: `1px solid ${badge.border}`,
                      color: badge.color, borderRadius: "10px",
                      padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700,
                    }}>{badge.label}</span>

                    {/* Delete */}
                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "#EF4444", borderRadius: "10px",
                        padding: "6px 12px", fontSize: "0.78rem",
                        fontWeight: 600, cursor: "pointer",
                      }}
                    >✕</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}