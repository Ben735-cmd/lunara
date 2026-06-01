"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

type Props = {
  userId: string
  refreshCourses: () => void
}

export default function AddCourseModal({
  userId,
  refreshCourses,
}: Props) {
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")

  async function addCourse() {
    if (!title || !code) return

    const { error } = await supabase
      .from("courses")
      .insert([
        {
          title,
          code,
          progress: 0,
          user_id: userId,
        },
      ])

    if (error) {
      alert(error.message)
      return
    }

    setTitle("")
    setCode("")

    setOpen(false)

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
            <h2 className="text-3xl font-bold">
              New Course
            </h2>

            <div className="space-y-5 mt-8">
              <input
                type="text"
                placeholder="Course title"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="w-full border border-black/10 rounded-2xl px-5 py-4 outline-none"
              />

              <input
                type="text"
                placeholder="Course code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value)
                }
                className="w-full border border-black/10 rounded-2xl px-5 py-4 outline-none"
              />
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
                className="flex-1 bg-black text-white rounded-2xl py-4"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}