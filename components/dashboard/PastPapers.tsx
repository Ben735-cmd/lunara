"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ExternalLink, FileText, Plus, Search, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { PapersSkeleton } from "../ui/Skeleton"

type Paper = {
  id: string
  course_code: string
  title: string
  year: number
  exam_type: string
  file_path: string
}

type MyCourse = { code: string; title: string }

const EXAM_TYPES = ["Final exam", "Mid-term", "Test", "Continuous assessment", "Supplementary", "Other"]
const BUCKET = "past-papers"

type UploadRow = {
  id: string
  file: File
  code: string
  title: string
  year: string
  type: string
  status: "ready" | "uploading" | "done" | "error"
  message?: string
}

// File names like "CS301_2024_Final.pdf", "cs 301 - 2023 mid-term.pdf" or
// "MA101 Test 2 2022.pdf" fill in the course code, year and exam type.
function guessFromFileName(fileName: string) {
  const base = fileName.replace(/\.pdf$/i, "")
  const codeMatch = base.match(/([A-Za-z]{2,5})[\s_-]?(\d{3,4})/)
  const yearMatch = base.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/)
  const lower = base.toLowerCase()
  let type = "Final exam"
  if (/supp/.test(lower)) type = "Supplementary"
  else if (/mid/.test(lower)) type = "Mid-term"
  else if (/\bca\b|continuous|assessment/.test(lower)) type = "Continuous assessment"
  else if (/test|quiz/.test(lower)) type = "Test"
  else if (/final|exam/.test(lower)) type = "Final exam"
  const code = codeMatch ? `${codeMatch[1].toUpperCase()}${codeMatch[2]}` : ""
  return { code, year: yearMatch ? yearMatch[1] : String(new Date().getFullYear()), type }
}

// "CS 301" and "cs301" are the same course. Papers are stored in this form.
function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export default function PastPapers() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [myCourses, setMyCourses] = useState<Map<string, string>>(new Map())
  const [isAdmin, setIsAdmin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [scope, setScope] = useState<"mine" | "all">("mine")
  const [search, setSearch] = useState("")
  const [year, setYear] = useState("all")
  const [examType, setExamType] = useState("all")
  const [error, setError] = useState("")
  const [openingId, setOpeningId] = useState<string | null>(null)

  // Admin upload: one or many PDFs, each with fields guessed from its file name.
  const [adding, setAdding] = useState(false)
  const [rows, setRows] = useState<UploadRow[]>([])
  const [uploading, setUploading] = useState(false)

  async function fetchAll() {
    const user = await getCurrentUser()
    if (!user) { setLoaded(true); return }

    const [coursesRes, adminRes, papersRes] = await Promise.all([
      supabase.from("courses").select("code, title").eq("user_id", user.id),
      supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("past_papers").select("*").order("year", { ascending: false }),
    ])

    const map = new Map<string, string>()
    for (const c of (coursesRes.data as MyCourse[] | null) ?? []) {
      if (c.code) map.set(normalizeCode(c.code), c.title)
    }
    setMyCourses(map)
    setIsAdmin(!!adminRes.data)
    if (papersRes.error) setError("Could not load past papers. Please try again.")
    setPapers((papersRes.data as Paper[] | null) ?? [])
    setLoaded(true)
  }

  useEffect(() => { fetchAll() }, [])

  const years = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a),
    [papers]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return papers.filter((p) => {
      if (scope === "mine" && !myCourses.has(p.course_code)) return false
      if (year !== "all" && String(p.year) !== year) return false
      if (examType !== "all" && p.exam_type !== examType) return false
      if (q && !`${p.course_code} ${p.title} ${myCourses.get(p.course_code) ?? ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [papers, scope, myCourses, year, examType, search])

  const groups = useMemo(() => {
    const byCode = new Map<string, Paper[]>()
    for (const p of visible) byCode.set(p.course_code, [...(byCode.get(p.course_code) ?? []), p])
    return Array.from(byCode.entries()).sort(([a], [b]) => {
      const mineA = myCourses.has(a) ? 0 : 1
      const mineB = myCourses.has(b) ? 0 : 1
      return mineA - mineB || a.localeCompare(b)
    })
  }, [visible, myCourses])

  async function openPaper(paper: Paper) {
    setError("")
    setOpeningId(paper.id)
    // Open the tab right away (inside the click) so popup blockers allow it.
    const tab = window.open("", "_blank")
    const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(paper.file_path, 3600)
    if (signError || !data?.signedUrl) {
      tab?.close()
      setError("Could not open this paper. Please try again.")
    } else if (tab) {
      tab.location.assign(data.signedUrl)
    } else {
      window.location.assign(data.signedUrl)
    }
    setOpeningId(null)
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    const added: UploadRow[] = []
    for (const file of Array.from(list)) {
      if (file.type !== "application/pdf") continue
      const guess = guessFromFileName(file.name)
      added.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        code: guess.code,
        title: guess.code ? `${guess.code} ${guess.type}` : file.name.replace(/\.pdf$/i, ""),
        year: guess.year,
        type: guess.type,
        status: "ready",
      })
    }
    if (added.length < list.length) setError("Only PDF files were added.")
    else setError("")
    setRows((prev) => [...prev, ...added])
  }

  function updateRow(id: string, patch: Partial<UploadRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function uploadAll() {
    setError("")
    setUploading(true)
    for (const row of rows) {
      if (row.status === "done") continue
      const norm = normalizeCode(row.code)
      const yr = Number(row.year)
      if (!norm || !row.title.trim() || !Number.isInteger(yr)) {
        updateRow(row.id, { status: "error", message: "Needs a course code, title and year." })
        continue
      }
      if (papers.some((p) => p.course_code === norm && p.year === yr && p.exam_type === row.type && p.title === row.title.trim())) {
        updateRow(row.id, { status: "error", message: "Already added." })
        continue
      }
      updateRow(row.id, { status: "uploading", message: undefined })
      const path = `${norm}/${yr}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.pdf`
      const { error: upError } = await supabase.storage.from(BUCKET).upload(path, row.file, { contentType: "application/pdf" })
      if (upError) { updateRow(row.id, { status: "error", message: upError.message }); continue }
      const { error: insError } = await supabase.from("past_papers").insert([
        { course_code: norm, title: row.title.trim(), year: yr, exam_type: row.type, file_path: path },
      ])
      if (insError) {
        await supabase.storage.from(BUCKET).remove([path])
        updateRow(row.id, { status: "error", message: insError.message })
        continue
      }
      updateRow(row.id, { status: "done" })
    }
    setUploading(false)
    fetchAll()
  }

  function closeUpload() {
    setAdding(false)
    setRows([])
    setError("")
  }

  async function deletePaper(paper: Paper) {
    if (!window.confirm(`Delete "${paper.title}" (${paper.year})?`)) return
    await supabase.storage.from(BUCKET).remove([paper.file_path])
    await supabase.from("past_papers").delete().eq("id", paper.id)
    fetchAll()
  }

  if (!loaded) return <PapersSkeleton />

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
  const selectClass = `${inputClass} sm:w-auto`
  const panel = "rounded-xl border border-line bg-surface"

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Past papers</h1>
          <p className="mt-2 text-sm text-ink-muted">Practise with papers from previous years, matched to your courses.</p>
        </div>
        {isAdmin && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Plus size={16} aria-hidden="true" /> Add papers
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-lg bg-danger-tint px-3.5 py-3 text-sm text-danger">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isAdmin && adding && (
        <div className={`${panel} mt-8 p-6`}>
          <h2 className="text-lg font-semibold text-ink">Add past papers</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Choose one or many PDFs. Name them like <span className="font-medium text-ink">CS301_2024_Final.pdf</span> and
            the course, year and exam type fill in by themselves. Check them before uploading.
          </p>

          <label
            htmlFor="pp-files"
            className="mt-4 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-line px-5 py-8 text-center transition-colors hover:border-accent hover:bg-accent-tint"
          >
            <FileText size={26} aria-hidden="true" className="text-ink-muted" />
            <span className="mt-2 text-sm font-medium text-ink">Choose PDF files</span>
            <span className="mt-0.5 text-xs text-ink-muted">You can select many at once</span>
            <input
              id="pp-files"
              type="file"
              accept="application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => { addFiles(e.target.files); e.target.value = "" }}
            />
          </label>

          {rows.length > 0 && (
            <ul className="mt-5 space-y-3">
              {rows.map((row) => (
                <li key={row.id} className="rounded-lg border border-line p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-ink-muted">{row.file.name}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.status === "done" && <span className="text-xs font-medium text-accent-strong">Uploaded</span>}
                      {row.status === "uploading" && <span className="text-xs text-ink-muted">Uploading...</span>}
                      {row.status === "error" && <span className="text-xs font-medium text-danger">{row.message}</span>}
                      {row.status !== "uploading" && row.status !== "done" && (
                        <button
                          onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                          aria-label={`Remove ${row.file.name}`}
                          className="rounded p-1 text-ink-muted hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[110px_1fr_90px_170px]">
                    <input aria-label="Course code" className={inputClass} placeholder="CS301" value={row.code}
                      disabled={row.status === "done" || uploading} onChange={(e) => updateRow(row.id, { code: e.target.value, status: "ready" })} />
                    <input aria-label="Title" className={inputClass} placeholder="Title" value={row.title}
                      disabled={row.status === "done" || uploading} onChange={(e) => updateRow(row.id, { title: e.target.value, status: "ready" })} />
                    <input aria-label="Year" type="number" className={inputClass} value={row.year}
                      disabled={row.status === "done" || uploading} onChange={(e) => updateRow(row.id, { year: e.target.value, status: "ready" })} />
                    <select aria-label="Exam type" className={inputClass} value={row.type}
                      disabled={row.status === "done" || uploading} onChange={(e) => updateRow(row.id, { type: e.target.value, status: "ready" })}>
                      {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={closeUpload}
              disabled={uploading}
              className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
            >
              {rows.some((r) => r.status === "done") ? "Done" : "Cancel"}
            </button>
            <button
              onClick={uploadAll}
              disabled={uploading || rows.every((r) => r.status === "done") || rows.length === 0}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : `Upload ${rows.filter((r) => r.status !== "done").length || ""} ${rows.filter((r) => r.status !== "done").length === 1 ? "paper" : "papers"}`.replace("  ", " ")}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            aria-label="Search past papers"
            placeholder="Search by course code or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select aria-label="Year" className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Exam type" className={selectClass} value={examType} onChange={(e) => setExamType(e.target.value)}>
          <option value="all">All exam types</option>
          {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div role="tablist" aria-label="Which papers" className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {([["mine", "My courses"], ["all", "All papers"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={scope === id}
              onClick={() => setScope(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                scope === id ? "bg-accent-tint text-accent-strong" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Papers */}
      {groups.length === 0 ? (
        <div className={`${panel} mt-6 px-6 py-14 text-center`}>
          <p className="font-medium text-ink">
            {papers.length === 0
              ? "No past papers yet"
              : scope === "mine" && myCourses.size === 0
                ? "Add your courses to see matching papers"
                : "No papers match"}
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">
            {papers.length === 0
              ? "Papers will appear here as they are added."
              : scope === "mine"
                ? "Papers are matched by course code. Try All papers to browse everything."
                : "Try a different year, exam type or search."}
          </p>
          {scope === "mine" && papers.length > 0 && (
            <button
              onClick={() => setScope("all")}
              className="mt-5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              Browse all papers
            </button>
          )}
        </div>
      ) : (
        groups.map(([courseCode, list]) => (
          <div key={courseCode} className={`${panel} mt-6 p-6`}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold text-ink">{courseCode}</h2>
              {myCourses.has(courseCode) && (
                <span className="rounded-md bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-strong">
                  {myCourses.get(courseCode)}
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y divide-line">
              {list.map((paper) => (
                <li key={paper.id} className="flex items-center gap-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-strong">
                    <FileText size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{paper.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{paper.year} · {paper.exam_type}</p>
                  </div>
                  <button
                    onClick={() => openPaper(paper)}
                    disabled={openingId === paper.id}
                    aria-label={`Open ${paper.title} ${paper.year}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
                  >
                    {openingId === paper.id ? "Opening..." : <>Open <ExternalLink size={14} aria-hidden="true" /></>}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => deletePaper(paper)}
                      aria-label={`Delete ${paper.title} ${paper.year}`}
                      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-muted">
        Papers are shared for study use. If you own a paper and want it removed, email{" "}
        <a href="mailto:benlubona735@gmail.com" className="font-medium text-accent-strong underline">benlubona735@gmail.com</a>.
      </p>
    </section>
  )
}
