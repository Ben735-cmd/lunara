"use client"

import { useState } from "react"
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

  async function addCourse() {
    if (!title || !code) return

    setUploading(true)

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

    const { error } = await supabase.from("courses").insert([
      {
        title,
        code,
        progress: 0,
        user_id: userId,
        content: courseContent,
      },
    ])

    if (error) {
      alert(error.message)
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white rounded-2xl px-5 py-3"
      >
        Add Course
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[420px] rounded-[32px] p-8">
            <h2 className="text-3xl font-bold">New Course</h2>

            <div className="space-y-5 mt-8">
              <input
                type="text"
                placeholder="Course title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-black/10 rounded-2xl px-5 py-4 outline-none"
              />

              <input
                type="text"
                placeholder="Course code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-black/10 rounded-2xl px-5 py-4 outline-none"
              />

              {/* File Upload */}
              <div
                onClick={() => document.getElementById("file-upload")?.click()}
                className="w-full border-2 border-dashed border-black/10 rounded-2xl px-5 py-6 text-center cursor-pointer hover:border-purple-400 transition"
              >
                {file ? (
                  <div>
                    <p className="font-semibold text-purple-600">{file.name}</p>
                    <p className="text-sm text-gray-400 mt-1">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-2">📄</p>
                    <p className="font-semibold text-gray-600">Upload course document</p>
                    <p className="text-sm text-gray-400 mt-1">PDF or Word (.docx)</p>
                  </div>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-black/10 rounded-2xl py-4"
              >
                Cancel
              </button>

              <button
                onClick={addCourse}
                disabled={uploading}
                className="flex-1 bg-black text-white rounded-2xl py-4"
              >
                {uploading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}