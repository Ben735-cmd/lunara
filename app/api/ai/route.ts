import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a helpful AI study assistant for university students. Help them with their studies, assignments, and learning.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1024,
  })

  const text = completion.choices[0]?.message?.content || "No response received."

  return NextResponse.json({ response: text })
}