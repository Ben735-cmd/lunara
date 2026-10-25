"use client"

import AIChat from "./AIChat"

export default function AITest() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-ink">Study assistant</h2>
      <p className="mt-1 text-sm text-ink-muted">Ask a question about anything you are studying.</p>

      <div className="mt-5">
        <AIChat />
      </div>
    </div>
  )
}
