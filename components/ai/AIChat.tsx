"use client"

import { useState } from "react"

export default function AIChat() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)

  async function askAI() {
    if (!prompt.trim()) return

    try {
      setLoading(true)
      setResponse("")

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      })

      const data = await res.json()

      setResponse(
        data.response ||
          data.error ||
          "No response received."
      )
    } catch (error) {
      console.error(error)

      setResponse(
        "Failed to connect to AI."
      )
    }

    setLoading(false)
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) =>
          setPrompt(e.target.value)
        }
        placeholder="Ask anything..."
        className="w-full min-h-[120px] border border-black/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-purple-400"
      />

      <button
        onClick={askAI}
        disabled={loading}
        className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-3 rounded-2xl font-medium"
      >
        {loading
          ? "Thinking..."
          : "Ask AI"}
      </button>

      {response && (
        <div className="mt-6 bg-[#F8FAFC] border border-black/5 rounded-2xl p-4 whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  )
}