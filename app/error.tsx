"use client"

import { useEffect } from "react"
import { reportError } from "../lib/errorLog"

// Shown instead of a blank white page if something fails while the app loads.
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { reportError(error, "route-error") }, [error])
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center text-ink">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        Lunara hit a problem. Your notes and tasks are safe. Try again, and if it keeps happening, reload the page.
      </p>
      <div className="mt-2 flex gap-3">
        <button onClick={() => unstable_retry()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-strong">
          Try again
        </button>
        <button onClick={() => window.location.reload()} className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper">
          Reload
        </button>
      </div>
    </main>
  )
}
