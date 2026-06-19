"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Note = {
  id: string
  title: string
  content: string
  created_at: string
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    setNotes(data || [])
  }

  useEffect(() => { fetchNotes() }, [])

  async function saveNote() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await supabase.from("notes").insert([{ title, content, user_id: userId }])
    setTitle("")
    setContent("")
    setAdding(false)
    setSaving(false)
    fetchNotes()
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id)
    if (selectedNote?.id === id) setSelectedNote(null)
    fetchNotes()
  }

  return (
    <main style={{ flex: 1, background: "#F0F2FF", padding: "44px 48px", overflowY: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap');
        .note-card { transition: all 0.2s ease; }
        .note-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <p style={{ color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your workspace</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.5rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>Notes 📝</h1>
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
        >+ New Note</button>
      </div>

      {/* Add Note Form */}
      {adding && (
        <div style={{
          background: "white", borderRadius: "24px",
          padding: "28px", marginBottom: "24px",
          boxShadow: "0 8px 32px rgba(139,92,246,0.1)",
          border: "1.5px solid rgba(139,92,246,0.2)",
        }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#0F172A", marginBottom: "16px", fontSize: "1.1rem" }}>New Note</h3>
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%", border: "1.5px solid #E2E8F0",
              borderRadius: "12px", padding: "12px 16px",
              fontSize: "1rem", fontWeight: 700, color: "#0F172A",
              outline: "none", marginBottom: "12px",
              background: "#FAFBFF",
            }}
          />
          {/* Divider between title and content */}
          <div style={{ height: "1px", background: "#E2E8F0", marginBottom: "12px" }} />
          <textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            style={{
              width: "100%", border: "1.5px solid #E2E8F0",
              borderRadius: "12px", padding: "12px 16px",
              fontSize: "0.9rem", color: "#334155",
              outline: "none", resize: "vertical",
              fontFamily: "inherit", lineHeight: 1.7,
              background: "#FAFBFF",
            }}
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={() => { setAdding(false); setTitle(""); setContent("") }}
              style={{
                flex: 1, background: "#F1F5F9", border: "none",
                borderRadius: "12px", padding: "12px",
                color: "#64748B", fontWeight: 600, cursor: "pointer",
              }}
            >Cancel</button>
            <button
              onClick={saveNote}
              disabled={saving}
              style={{
                flex: 2, background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                border: "none", borderRadius: "12px", padding: "12px",
                color: "white", fontWeight: 700, cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >{saving ? "Saving..." : "Save Note"}</button>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      {notes.length === 0 && !adding ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📝</p>
          <p style={{ color: "#94A3B8", fontWeight: 500 }}>No notes yet</p>
          <p style={{ color: "#CBD5E1", fontSize: "0.85rem", marginTop: "8px" }}>Click "New Note" to get started</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {notes.map((note) => (
            <div
              key={note.id}
              className="note-card"
              onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
              style={{
                background: "white", borderRadius: "20px",
                overflow: "hidden", cursor: "pointer",
                border: selectedNote?.id === note.id
                  ? "1.5px solid rgba(139,92,246,0.4)"
                  : "1.5px solid #F1F5F9",
                boxShadow: selectedNote?.id === note.id
                  ? "0 8px 32px rgba(139,92,246,0.12)"
                  : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s",
              }}
            >
              {/* Title bar — clearly separated */}
              <div style={{
                padding: "18px 20px",
                background: selectedNote?.id === note.id
                  ? "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.06))"
                  : "#FAFBFF",
                borderBottom: "1.5px solid #F1F5F9",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.95rem", fontWeight: 700, color: "#0F172A",
                  flex: 1, marginRight: "12px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{note.title}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "#EF4444", borderRadius: "8px",
                    padding: "4px 10px", fontSize: "0.72rem",
                    fontWeight: 600, cursor: "pointer", flexShrink: 0,
                  }}
                >✕</button>
              </div>

              {/* Content area */}
              <div style={{ padding: "16px 20px" }}>
                <p style={{
                  color: "#64748B", fontSize: "0.85rem",
                  lineHeight: 1.7,
                  display: "-webkit-box",
                  WebkitLineClamp: selectedNote?.id === note.id ? "unset" : 4,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: selectedNote?.id === note.id ? "visible" : "hidden",
                  whiteSpace: "pre-wrap",
                }}>{note.content}</p>

                <p style={{
                  color: "#CBD5E1", fontSize: "0.72rem",
                  marginTop: "12px", paddingTop: "12px",
                  borderTop: "1px solid #F1F5F9",
                }}>
                  {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}