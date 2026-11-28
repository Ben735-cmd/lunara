"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "../../lib/supabase"

const RichText = dynamic(() => import("../ui/RichText"))

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
        placeholder="Ask a question"
        aria-label="Your question"
        className="min-h-[120px] w-full rounded-lg border border-line bg-surface p-3.5 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={askAI}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>

        {(prompt || response) && (
          <button
            onClick={clearChat}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-paper hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {response && (
        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <RichText>{response}</RichText>
        </div>
      )}
    </div>
  )
}