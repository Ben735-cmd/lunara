"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

type Props = {
  userId: string
  refreshAssignments: () => void
}

export default function AddAssignmentModal({
  userId,
  refreshAssignments,
}: Props) {
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] =
    useState("")
  const [error, setError] = useState("")

  async function addAssignment() {
    if (!title || !dueDate) {
      setError("Enter a title and a due date.")
      return
    }
    setError("")

    const { error: insertError } = await supabase
      .from("assignments")
      .insert([
        {
          title,
          due_date: dueDate,
          completed: false,
          user_id: userId,
        },
      ])

    if (insertError) {
      setError(insertError.message)
      return
    }

    setTitle("")
    setDueDate("")

    setOpen(false)

    refreshAssignments()
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
      >
        Add task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="new-assignment-title" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6">
            <h2 id="new-assignment-title" className="text-xl font-semibold text-ink">New assignment</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="assignment-title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
                <input
                  id="assignment-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="assignment-due" className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
                <input
                  id="assignment-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>

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
                onClick={addAssignment}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
              >
                Create assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
