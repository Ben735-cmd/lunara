"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AIChat() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)

  async function askAI() {
    if (!prompt.trim()) return

    try {
      setLoading(true)
      setResponse("")

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setResponse("Please log in to use the AI assistant.")
        setLoading(false)
        return
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      setResponse(
        data.response ||
        data.error ||
        "No response received."
      )
    } catch (error) {
      console.error(error)
      setResponse("Failed to connect to AI.")
    }

    setLoading(false)
  }

  function clearChat() {
    setPrompt("")
    setResponse("")
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask anything..."
        className="w-full min-h-[120px] border border-black/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-purple-400"
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={askAI}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-3 rounded-2xl font-medium disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>

        {(prompt || response) && (
          <button
            onClick={clearChat}
            className="border border-black/10 text-[#64748B] px-5 py-3 rounded-2xl font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {response && (
        <div className="mt-6 bg-[#F8FAFC] border border-black/5 rounded-2xl p-4 whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  )
}