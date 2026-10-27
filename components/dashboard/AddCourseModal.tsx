"use client"

import { useRef, useState } from "react"
import { FileText } from "lucide-react"
import { supabase } from "../../lib/supabase"

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
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

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

    const controller = new AbortController()
    abortRef.current = controller
    let courseContent = ""

    try {
      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        const timer = setTimeout(() => controller.abort(), 45000)
        try {
          const res = await fetch("/api/extract", { method: "POST", body: formData, signal: controller.signal })
          const data = await res.json().catch(() => null)
          if (!res.ok || !data) {
            setError(data?.error || "Could not read that file. Try a smaller PDF or Word file.")
            setUploading(false)
            return
          }
          courseContent = data.text || ""
        } finally {
          clearTimeout(timer)
        }
      }

      const { error: insertError } = await supabase.from("courses").insert([
        { title, code, progress: 0, user_id: userId, content: courseContent },
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
      setError("This is taking too long. Check your connection and try again.")
      setUploading(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
      >
        Add course
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="new-course-title" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6">
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
                {uploading ? "Creating..." : "Create course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
