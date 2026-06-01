"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

type AddAssignmentProps = {
  userId: string
  refreshAssignments: () => void
}

export default function AddAssignment({
  userId,
  refreshAssignments,
}: AddAssignmentProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [loading, setLoading] = useState(false)

  async function createAssignment() {
    if (!title || !dueDate) return

    setLoading(true)

    const { error } = await supabase
      .from("assignments")
      .insert({
        title,
        due_date: dueDate,
        user_id: userId,
      })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      setTitle("")
      setDueDate("")

      refreshAssignments()
    }
  }

  return (
    <div className="bg-[#0F172A] border border-white/5 rounded-[32px] p-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        Add Assignment
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Assignment Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full bg-[#111827] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500"
        />

        <input
          type="date"
          value={dueDate}
          onChange={(e) =>
            setDueDate(e.target.value)
          }
          className="w-full bg-[#111827] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-purple-500"
        />

        <button
          onClick={createAssignment}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition rounded-2xl py-4 text-white font-semibold"
        >
          {loading
            ? "Creating..."
            : "Create Assignment"}
        </button>
      </div>
    </div>
  )
}