"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { supabase } from "../../lib/supabase"

type Props = {
  userId: string
  refreshCourses: () => void
}

export default function AddCourseModal({ userId, refreshCourses }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function addCourse() {
    if (!title || !code) {
      setError("Enter a course title and code.")
      return
    }

    setUploading(true)
    setError("")

    let courseContent = ""

    if (file) {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      courseContent = data.text || ""
    }

    const { error: insertError } = await supabase.from("courses").insert([
      {
        title,
        code,
        progress: 0,
        user_id: userId,
        content: courseContent,
      },
    ])

    if (insertError) {
      setError(insertError.message)
      setUploading(false)
      return
    }

    setTitle("")
    setCode("")
    setFile(null)
    setOpen(false)
    setUploading(false)
    refreshCourses()
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
                    <span className="mt-0.5 text-xs text-ink-muted">Click to choose a different file</span>
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-sm font-medium text-ink">Upload course document</span>
                    <span className="mt-0.5 text-xs text-ink-muted">PDF or Word (.docx)</span>
                  </>
                )}
              </button>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {error && (
                <p role="alert" className="rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{error}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setOpen(false); setError("") }}
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
