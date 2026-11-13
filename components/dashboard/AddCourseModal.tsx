"use client"

import { useDialog } from "../../lib/useDialog"
import { useRef, useState } from "react"
import { FileText } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { newId } from "../../lib/uuid"
import { postWithProgress } from "../../lib/uploadWithProgress"

type Props = {
  userId: string
  refreshCourses: () => void
}

const MAX_FILE_MB = 4
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function AddCourseModal({ userId, refreshCourses }: Props) {
  const [open, setOpen] = useState(false)
  const dialogRef = useDialog<HTMLDivElement>(open, () => closeForm())
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  // Where the upload is: 0 to 1 while bytes are sent, then reading the document, then saving the course.
  const [stage, setStage] = useState<"sending" | "reading" | "saving">("sending")
  const [sent, setSent] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  // Closing the form drops any upload in progress and clears the fields, so
  // the next time it opens it starts fresh.
  function closeForm() {
    abortRef.current?.abort()
    abortRef.current = null
    setTitle("")
    setCode("")
    setFile(null)
    setError("")
    setUploading(false)
    setStage("sending")
    setSent(0)
    setOpen(false)
  }

  async function addCourse() {
    if (!title || !code) {
      setError("Enter a course title and code.")
      return
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatSize(file.size)}, over the ${MAX_FILE_MB} MB limit. Choose a smaller file, or create the course without it.`)
      return
    }

    setUploading(true)
    setError("")
    setStage("sending")
    setSent(0)

    const controller = new AbortController()
    abortRef.current = controller
    let courseContent = ""
    // The id is chosen here so pictures pulled from the PDF can be filed under it.
    const courseId = newId()

    try {
      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("courseId", courseId)
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        const res = await postWithProgress("/api/extract", formData, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
          onProgress: setSent,
          onSent: () => setStage("reading"),
        })
        const data = res.data as { text?: string; error?: string } | null
        if (!res.ok || !data) {
          setError(data?.error || "Could not read that file. Try a smaller PDF or Word file.")
          setUploading(false)
          return
        }
        courseContent = data.text || ""
      }

      setStage("saving")
      const { error: insertError } = await supabase.from("courses").insert([
        { id: courseId, title, code, progress: 0, user_id: userId, content: courseContent },
      ])
      if (controller.signal.aborted) return
      if (insertError) {
        setError(insertError.message)
        setUploading(false)
        return
      }
      abortRef.current = null
      closeForm()
      refreshCourses()
    } catch {
      if (abortRef.current !== controller) return // cancelled by the user
      setError("The upload stalled. Check your connection and try again.")
      setUploading(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-accent/25 bg-accent-tint px-4 py-2 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/15"
      >
        Add course
      </button>

      {open && (
        <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-course-title" className="anim-pop max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6">
            <h2 id="new-course-title" className="text-xl font-semibold text-ink">New course</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="course-title" className="mb-1.5 block text-sm font-medium text-ink">Course title</label>
                <input
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="course-code" className="mb-1.5 block text-sm font-medium text-ink">Course code</label>
                <input
                  id="course-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* File Upload */}
              <button
                type="button"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="flex w-full flex-col items-center rounded-lg border border-dashed border-line px-4 py-5 text-center transition-colors hover:border-accent hover:bg-accent-tint"
              >
                <FileText size={22} aria-hidden="true" className="text-ink-muted" />
                {file ? (
                  <>
                    <span className="mt-2 text-sm font-medium text-accent-strong">{file.name}</span>
                    <span className="mt-0.5 text-xs text-ink-muted">{formatSize(file.size)} · Click to choose a different file</span>
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-sm font-medium text-ink">Upload course document</span>
                    <span className="mt-0.5 text-xs text-ink-muted">PDF or Word (.docx) · Max {MAX_FILE_MB} MB</span>
                  </>
                )}
              </button>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0] || null
                  e.target.value = ""
                  if (picked && picked.size > MAX_FILE_BYTES) {
                    setFile(null)
                    setError(`"${picked.name}" is ${formatSize(picked.size)}. Files must be under ${MAX_FILE_MB} MB. Compress it or upload fewer pages.`)
                    return
                  }
                  setError("")
                  setFile(picked)
                }}
              />

              {uploading && file && (
                <div className="rounded-lg border border-line bg-paper px-4 py-3" aria-live="polite">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">
                      {stage === "sending" ? "Uploading…" : stage === "reading" ? "Reading your document…" : "Saving your course…"}
                    </span>
                    {stage === "sending" && <span className="tabular-nums text-ink-muted">{Math.round(sent * 100)}%</span>}
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={stage === "sending" ? Math.round(sent * 100) : undefined}
                    className="mt-2.5 h-2 overflow-hidden rounded-full bg-line"
                  >
                    {stage === "sending" ? (
                      <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out" style={{ width: `${Math.max(3, sent * 100)}%` }} />
                    ) : (
                      <div className="upload-indeterminate h-full w-1/3 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {stage === "sending" ? `${formatSize(Math.round(file.size * sent))} of ${formatSize(file.size)}` : "Almost there. This can take a few seconds for long documents."}
                  </p>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{error}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                Cancel
              </button>

              <button
                onClick={addCourse}
                disabled={uploading}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (stage === "sending" && file ? `Uploading ${Math.round(sent * 100)}%` : "Creating...") : "Create course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
