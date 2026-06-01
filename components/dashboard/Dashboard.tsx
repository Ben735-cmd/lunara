"use client"

import { useEffect, useState } from "react"

import { supabase } from "../../lib/supabase"

import Sidebar from "../layout/Sidebar"

import AddCourseModal from "./AddCourseModal"
import AddAssignmentModal from "./AddAssignmentModal"

type Props = {
  email: string
  logout: () => void
}

type Course = {
  id: string
  title: string
  code: string
  progress: number
}

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
}

export default function Dashboard({
  email,
  logout,
}: Props) {
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] =
    useState<Assignment[]>([])

  const [userId, setUserId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  async function fetchCourses() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setUserId(user.id)

    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)

    setCourses(data || [])
  }

  async function fetchAssignments() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)

    setAssignments(data || [])
  }

  useEffect(() => {
    fetchCourses()
    fetchAssignments()
  }, [])

  async function increaseProgress(
    id: string,
    progress: number
  ) {
    await supabase
      .from("courses")
      .update({ progress: progress + 10 })
      .eq("id", id)

    fetchCourses()
  }

  async function deleteCourse(id: string) {
    await supabase.from("courses").delete().eq("id", id)
    fetchCourses()
  }

  async function toggleAssignment(
    id: string,
    completed: boolean
  ) {
    await supabase
      .from("assignments")
      .update({ completed: !completed })
      .eq("id", id)

    fetchAssignments()
  }

  async function deleteAssignment(id: string) {
    await supabase.from("assignments").delete().eq("id", id)
    fetchAssignments()
  }

  const productivity =
    assignments.length === 0
      ? 0
      : Math.round(
          (assignments.filter((a) => a.completed).length /
            assignments.length) *
            100
        )

  // Filtered lists based on search query
  const query = searchQuery.toLowerCase()
  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
  )
  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(query)
  )

  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      <Sidebar logout={logout} />

      <section className="flex-1 p-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#64748B]">Welcome</p>

            <h1 className="text-6xl font-black mt-2">
              Ben 👋
            </h1>

            <p className="text-[#64748B] mt-3">{email}</p>
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search courses & tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white rounded-2xl pl-12 pr-5 py-3.5 w-72 text-sm text-[#1E293B] placeholder-[#94A3B8] shadow-sm border border-black/5 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-10">
          <div className="bg-white rounded-[28px] p-7">
            <p>Courses</p>
            <h2 className="text-5xl font-black mt-4">
              {courses.length}
            </h2>
          </div>

          <div className="bg-white rounded-[28px] p-7">
            <p>Assignments</p>
            <h2 className="text-5xl font-black mt-4">
              {assignments.length}
            </h2>
          </div>

          <div className="bg-white rounded-[28px] p-7">
            <p>Productivity</p>
            <h2 className="text-5xl font-black mt-4">
              {productivity}%
            </h2>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-[28px] p-7 text-white">
            <p>Study Streak</p>
            <h2 className="text-5xl font-black mt-4">12</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-10">
          <div className="col-span-2 bg-white rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">
                  Current Courses
                </h2>
                <p className="text-[#64748B] mt-2">
                  Your semester modules
                </p>
              </div>

              <AddCourseModal
                userId={userId}
                refreshCourses={fetchCourses}
              />
            </div>

            <div className="space-y-5">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="border border-black/5 rounded-3xl p-6"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {course.title}
                        </h3>
                        <p className="text-[#64748B] mt-2">
                          {course.code}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="text-red-500"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-6">
                      <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      <button
                        onClick={() =>
                          increaseProgress(course.id, course.progress)
                        }
                        className="mt-5 bg-black text-white rounded-2xl px-5 py-3"
                      >
                        Increase Progress
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#94A3B8] text-sm py-4 text-center">
                  No courses match your search.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-8">
              <h2 className="text-2xl font-bold">
                Upcoming Tasks
              </h2>

              <div className="mt-6">
                <AddAssignmentModal
                  userId={userId}
                  refreshAssignments={fetchAssignments}
                />
              </div>

              <div className="space-y-4 mt-6">
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-black/5 rounded-2xl p-5"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">
                            {assignment.title}
                          </p>
                          <p className="text-sm text-[#64748B] mt-2">
                            Due {assignment.due_date}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              toggleAssignment(
                                assignment.id,
                                assignment.completed
                              )
                            }
                            className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm"
                          >
                            Done
                          </button>

                          <button
                            onClick={() =>
                              deleteAssignment(assignment.id)
                            }
                            className="bg-red-500 text-white px-3 py-2 rounded-xl text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#94A3B8] text-sm py-4 text-center">
                    No tasks match your search.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-black to-[#1E293B] rounded-[32px] p-8 text-white">
              <p className="text-white/70">Daily Motivation</p>
              <h2 className="text-3xl font-bold mt-5 leading-tight">
                Small progress every day compounds into massive
                results.
              </h2>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}