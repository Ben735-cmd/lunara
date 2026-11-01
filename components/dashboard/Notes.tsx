"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { NotesSkeleton } from "../ui/Skeleton"
import PageHeader from "../ui/PageHeader"
import { formatDate } from "../../lib/dates"
import ErrorState from "../ui/ErrorState"
import { useOnline } from "../../lib/online"
import {
  cacheServerNotes, flushQueue, isNetworkError, pendingCount, queueAdd, queueDelete, visibleNotes, type Note,
} from "../../lib/offlineNotes"

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [userId, setUserId] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [waiting, setWaiting] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const online = useOnline()

  const refreshFromCache = useCallback((uid: string) => {
    setNotes(visibleNotes(uid))
    setWaiting(pendingCount(uid))
  }, [])

  const fetchNotes = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }
    setUserId(user.id)
    // Show what is saved on this device straight away, then refresh from the server.
    refreshFromCache(user.id)
    setLoaded(true)
    if (!navigator.onLine) return

    await flushQueue(user.id, {
      insert: async (n) => (await supabase.from("notes").insert([{ ...n, user_id: user.id }])).error,
      remove: async (id) => (await supabase.from("notes").delete().eq("id", id)).error,
    })
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) {
      setLoadFailed(visibleNotes(user.id).length === 0)
      return
    }
    setLoadFailed(false)
    cacheServerNotes(user.id, data || [])
    refreshFromCache(user.id)
  }, [refreshFromCache])

  useEffect(() => { fetchNotes() }, [fetchNotes])
  // Upload anything written offline as soon as the connection returns.
  useEffect(() => { if (online) fetchNotes() }, [online, fetchNotes])

  async function saveNote() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const { error } = navigator.onLine
      ? await supabase.from("notes").insert([{ title, content, user_id: userId }])
      : { error: { message: "offline" } }
    if (error && !isNetworkError(error)) {
      setSaving(false)
      return
    }
    if (error) queueAdd(userId, title, content)
    setTitle("")
    setContent("")
    setAdding(false)
    setSaving(false)
    if (error) refreshFromCache(userId)
    else fetchNotes()
  }

  async function deleteNote(id: string) {
    if (selectedNote?.id === id) setSelectedNote(null)
    if (id.startsWith("local-") || !navigator.onLine) {
      queueDelete(userId, id)
      refreshFromCache(userId)
      return
    }
    const { error } = await supabase.from("notes").delete().eq("id", id)
    if (error && isNetworkError(error)) queueDelete(userId, id)
    if (error) refreshFromCache(userId)
    else fetchNotes()
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  if (!loaded) return <NotesSkeleton />

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <PageHeader
        title="Notes"
        subtitle="Keep quick notes for lectures, ideas and exam reminders."
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Plus size={16} aria-hidden="true" /> New note
          </button>
        }
      />

      {waiting > 0 && (
        <p role="status" className="mt-4 rounded-lg bg-accent-tint px-4 py-2.5 text-sm text-accent-strong">
          {waiting} {waiting === 1 ? "change is" : "changes are"} saved on this device and will sync when you are back online.
        </p>
      )}

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
      {loadFailed && notes.length === 0 ? (
        <ErrorState title="We couldn't load your notes" offline={!online} onRetry={fetchNotes} />
      ) : notes.length === 0 && !adding ? (
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
                  {note.pending && (
                    <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[0.7rem] font-medium text-accent-strong">Not synced</span>
                  )}
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
                    {formatDate(note.created_at, { weekday: false })}
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
