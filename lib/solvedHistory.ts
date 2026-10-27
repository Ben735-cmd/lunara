import { supabase } from "./supabase"
import { getCurrentUser } from "./auth"

export type SolvedQuestion = {
  id: string
  title: string
  source_name: string | null
  source_type: "image" | "pdf" | "docx"
  question_text: string | null
  thumbnail: string | null
  solution: string
  created_at: string
}

/** A short title taken from the "Understanding the Problem" part of the answer. */
export function titleFromSolution(solution: string, fallback: string) {
  const lines = solution.split("\n").map((l) => l.trim()).filter(Boolean)
  const start = lines.findIndex((l) => /understanding the problem/i.test(l))
  const candidate = lines.slice(start + 1).find((l) => !l.startsWith("#") && l.length > 8)
  const clean = (candidate ?? "")
    .replace(/\$+/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!clean) return fallback
  return clean.length > 90 ? `${clean.slice(0, 87).trimEnd()}...` : clean
}

/** Shrinks a photo to a small JPEG so history stays light. Returns null if it cannot. */
export function makeThumbnail(dataUrl: string, maxSide = 320): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(null)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.6))
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

export async function saveSolvedQuestion(item: Omit<SolvedQuestion, "id" | "created_at">): Promise<SolvedQuestion | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const { data, error } = await supabase
    .from("solved_questions")
    .insert([{ ...item, user_id: user.id }])
    .select("*")
    .single()
  if (error) {
    console.error("Could not save to history:", error.message)
    return null
  }
  return data as SolvedQuestion
}
