"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

type AddCourseProps = {
  userId: string
  refreshCourses: () => void
}

export default function AddCourse({
  userId,
  refreshCourses,
}: AddCourseProps) {
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function createCourse() {
    if (!title || !code) return

    setLoading(true)

    const { error } = await supabase
      .from("courses")
      .insert({
        title,
        code,
        progress: 0,
        user_id: userId,
      })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      setTitle("")
      setCode("")

      refreshCourses()
    }
  }

  return (
    <div className="bg-[#0F172A] border border-white/5 rounded-[32px] p-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        Add Course
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Course Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full bg-[#111827] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500"
        />

        <input
          type="text"
          placeholder="Course Code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value)
          }
          className="w-full bg-[#111827] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500"
        />

        <button
          onClick={createCourse}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 transition rounded-2xl py-4 text-white font-semibold"
        >
          {loading
            ? "Creating..."
            : "Create Course"}
        </button>
      </div>
    </div>
  )
}