"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, FileText, Image as ImageIcon, Search, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import type { SolvedQuestion } from "../../lib/solvedHistory"
import { Skeleton, SolutionSkeleton } from "../ui/Skeleton"
import { formatDate as formatDateShared } from "../../lib/dates"

const RichText = dynamic(() => import("../ui/RichText"), { loading: () => <SolutionSkeleton /> })

function formatDate(iso: string) {
  return formatDateShared(iso, { weekday: false })
}

export default function SolverHistory({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<SolvedQuestion[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)

  async function load() {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }
    const { data, error } = await supabase
      .from("solved_questions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
    setFailed(!!error)
    setItems((data ?? []) as SolvedQuestion[])
    setLoaded(true)
  }

  useEffect(() => { load() }, [refreshKey])

  async function remove(item: SolvedQuestion) {
    if (!window.confirm("Delete this question from your history?")) return
    const { error } = await supabase.from("solved_questions").delete().eq("id", item.id)
    if (error) return
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setOpenId(null)
  }

  async function removeFromList(item: SolvedQuestion) {
    const { error } = await supabase.from("solved_questions").delete().eq("id", item.id)
    if (error) { setClearFailed(true); return }
    setClearFailed(false)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  async function clearAll() {
    const user = await getCurrentUser()
    if (!user) return
    setClearing(true)
    setClearFailed(false)
    const { error } = await supabase.from("solved_questions").delete().eq("user_id", user.id)
    setClearing(false)
    if (error) { setClearFailed(true); return }
    setItems([])
    setSearch("")
    setConfirmClear(false)
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => `${i.title} ${i.source_name ?? ""} ${i.question_text ?? ""} ${i.solution}`.toLowerCase().includes(q))
  }, [items, search])

  const open = items.find((i) => i.id === openId) ?? null
  const panel = "rounded-xl border border-line bg-surface"

  if (!loaded) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading history" className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${panel} flex items-center gap-4 p-4`}>
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (open) {
    return (
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setOpenId(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            <ArrowLeft size={16} aria-hidden="true" /> History
          </button>
          <button
            onClick={() => remove(open)}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
          >
            <Trash2 size={16} aria-hidden="true" /> Delete
          </button>
        </div>

        <div className={`${panel} mt-5 p-6`}>
          <h2 className="text-lg font-semibold text-ink">{open.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {formatDate(open.created_at)}{open.source_name ? ` · ${open.source_name}` : ""}
          </p>

          {open.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={open.thumbnail} alt="The question you photographed" className="mt-4 max-h-48 rounded-lg border border-line" />
          )}

          {open.question_text && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-ink">Question text</summary>
              <p className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-paper p-4 text-sm leading-relaxed text-ink-muted">
                {open.question_text}
              </p>
            </details>
          )}

          <div className="mt-5 border-t border-line pt-5">
            <RichText>{open.solution}</RichText>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {failed && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-tint px-3.5 py-3 text-sm text-danger">
          Could not load your history. Please try again later.
        </p>
      )}

      {clearFailed && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-tint px-3.5 py-3 text-sm text-danger">
          Could not delete. Check your connection and try again.
        </p>
      )}

      {items.length > 0 && (
        <div className="mb-5 flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              aria-label="Search your history"
              placeholder="Search solved questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
          >
            <Trash2 size={16} aria-hidden="true" /> Clear all
          </button>
        </div>
      )}

      {confirmClear && (
        <div role="alertdialog" aria-labelledby="clear-title" className="mb-5 rounded-xl border border-danger/40 bg-danger-tint p-4">
          <p id="clear-title" className="text-sm font-medium text-ink">
            Delete all {items.length} solved question{items.length === 1 ? "" : "s"}?
          </p>
          <p className="mt-1 text-sm text-ink-muted">This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setConfirmClear(false)}
              disabled={clearing}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={clearAll}
              disabled={clearing}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? "Deleting..." : "Yes, delete all"}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className={`${panel} px-6 py-14 text-center`}>
          <p className="font-medium text-ink">{items.length === 0 ? "No solved questions yet" : "Nothing matches your search"}</p>
          <p className="mt-1.5 text-sm text-ink-muted">
            {items.length === 0 ? "Questions you solve are saved here for later." : "Try different words."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="flex items-stretch gap-2">
              <button
                onClick={() => setOpenId(item.id)}
                className={`${panel} flex min-w-0 flex-1 items-center gap-4 p-4 text-left transition-colors hover:border-accent/60`}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-strong">
                    {item.source_type === "image" ? <ImageIcon size={22} aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium text-ink">{item.title}</span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {formatDate(item.created_at)}{item.source_name ? ` · ${item.source_name}` : ""}
                  </span>
                </span>
              </button>
              <button
                onClick={() => removeFromList(item)}
                aria-label={`Delete ${item.title}`}
                className={`${panel} shrink-0 px-3 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
