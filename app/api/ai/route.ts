import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Groq from "groq-sdk"

// Server-side Supabase client, used only to verify the caller's access token.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MAX_PROMPT_LENGTH = 2000

export async function POST(req: NextRequest) {
  // 1. Require a logged-in user — reject anything without a valid session token.
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "You must be logged in to use the AI assistant." }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 })
  }

  // 2. Validate the request body before spending any AI tokens on it.
  let prompt: unknown
  try {
    const body = await req.json()
    prompt = body?.prompt
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Please enter a question." }, { status: 400 })
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Please keep your question under ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 }
    )
  }

  // 3. Call Groq, with proper error handling so a provider hiccup doesn't 500 the route.
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI study assistant for university students. Help them with their studies, assignments, and learning.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
    })

    const text = completion.choices[0]?.message?.content || "No response received."

    return NextResponse.json({ response: text })
  } catch (err) {
    console.error("Groq API error:", err)
    return NextResponse.json(
      { error: "The AI assistant is temporarily unavailable. Please try again in a moment." },
      { status: 502 }
    )
  }
}
