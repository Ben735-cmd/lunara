"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { NotesSkeleton } from "../ui/Skeleton"

type Note = {
  id: string
  title: string
  content: string
  created_at: string
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [userId, setUserId] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    setNotes(data || [])
    setLoaded(true)
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

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  if (!loaded) return <NotesSkeleton />

  return (
    <section className="w-full flex-1 overflow-y-auto bg-paper px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Notes</h1>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
        >
          <Plus size={16} aria-hidden="true" /> New note
        </button>
      </div>

      {/* Add note form */}
      {adding && (
        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">New note</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="note-title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
              <input
                id="note-title"
                type="text"
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="note-content" className="mb-1.5 block text-sm font-medium text-ink">Note</label>
              <textarea
                id="note-content"
                placeholder="Write your note here"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => { setAdding(false); setTitle(""); setContent("") }}
              className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              Cancel
            </button>
            <button
              onClick={saveNote}
              disabled={saving}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save note"}
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {notes.length === 0 && !adding ? (
        <div className="mt-8 rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <p className="font-medium text-ink">No notes yet</p>
          <p className="mt-1.5 text-sm text-ink-muted">Choose New note to get started.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {notes.map((note) => {
            const selected = selectedNote?.id === note.id
            return (
              <div
                key={note.id}
                className={`overflow-hidden rounded-xl border bg-surface transition-colors ${
                  selected ? "border-accent" : "border-line hover:border-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <button
                    onClick={() => setSelectedNote(selected ? null : note)}
                    aria-expanded={selected}
                    className="min-w-0 flex-1 truncate text-left font-medium text-ink hover:text-accent-strong"
                  >
                    {note.title}
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    aria-label={`Delete ${note.title}`}
                    className="shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="px-5 py-4">
                  <p className={`whitespace-pre-wrap text-sm leading-relaxed text-ink-muted ${selected ? "" : "line-clamp-4"}`}>
                    {note.content}
                  </p>
                  <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                    {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
