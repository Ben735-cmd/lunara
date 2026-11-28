"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "../../lib/supabase"

const RichText = dynamic(() => import("../ui/RichText"))

export default function AIChat() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<{ remaining: number; limit: number } | null>(null)

  // Show how many requests are left today. Failing to load this never blocks asking.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch("/api/ai", { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (!cancelled && data.usage) setUsage(data.usage)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

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

      if (data.usage) setUsage(data.usage)

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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={askAI}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>

        {usage && (
          <span className={`ml-auto text-xs ${usage.remaining === 0 ? "font-medium text-danger" : "text-ink-muted"}`} aria-live="polite">
            {usage.remaining === 0 ? "No AI requests left today" : `${usage.remaining} of ${usage.limit} AI requests left today`}
          </span>
        )}

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