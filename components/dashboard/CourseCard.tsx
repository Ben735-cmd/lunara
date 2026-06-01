"use client"

import { supabase } from "../../lib/supabase"

type CourseCardProps = {
  id: string
  title: string
  code: string
  progress: number
  refreshCourses: () => void
}

export default function CourseCard({
  id,
  title,
  code,
  progress,
  refreshCourses,
}: CourseCardProps) {
  async function increaseProgress() {
    const newProgress =
      progress >= 100 ? 100 : progress + 10

    await supabase
      .from("courses")
      .update({
        progress: newProgress,
      })
      .eq("id", id)

    refreshCourses()
  }

  async function deleteCourse() {
    await supabase
      .from("courses")
      .delete()
      .eq("id", id)

    refreshCourses()
  }

  return (
    <div className="glass-card p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-[#0F172A]">
            {title}
          </p>

          <p className="text-[#64748B] mt-2">
            {code}
          </p>
        </div>

        <button
          onClick={deleteCourse}
          className="text-red-500 hover:text-red-600 font-medium"
        >
          Delete
        </button>
      </div>

      {/* Progress */}
      <div className="mt-8">
        <div className="flex justify-between mb-3">
          <p className="text-[#64748B]">
            Progress
          </p>

          <p className="font-semibold">
            {progress}%
          </p>
        </div>

        <div className="w-full h-3 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <button
          onClick={increaseProgress}
          className="mt-6 bg-black text-white rounded-2xl px-5 py-3 hover:opacity-90 transition"
        >
          Increase Progress
        </button>
      </div>
    </div>
  )
}