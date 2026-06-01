"use client"

import { supabase } from "../../lib/supabase"

type AssignmentCardProps = {
  id: string
  title: string
  dueDate: string
  completed: boolean
  refreshAssignments: () => void
}

export default function AssignmentCard({
  id,
  title,
  dueDate,
  completed,
  refreshAssignments,
}: AssignmentCardProps) {
  async function toggleComplete() {
    await supabase
      .from("assignments")
      .update({
        completed: !completed,
      })
      .eq("id", id)

    refreshAssignments()
  }

  async function deleteAssignment() {
    await supabase
      .from("assignments")
      .delete()
      .eq("id", id)

    refreshAssignments()
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p
            className={`text-lg font-semibold ${
              completed
                ? "line-through text-[#94A3B8]"
                : "text-[#0F172A]"
            }`}
          >
            {title}
          </p>

          <p className="text-[#64748B] mt-2">
            Due {dueDate}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={toggleComplete}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            {completed ? "Undo" : "Done"}
          </button>

          <button
            onClick={deleteAssignment}
            className="bg-red-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}