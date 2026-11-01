import { supabase } from "./supabase"

// A small crash log: unexpected errors are saved to the client_errors table
// (see supabase/observability.sql) so they can be read later. It never blocks
// the app, never throws, and sends at most a few reports per visit.
const MAX_PER_VISIT = 5
const seen = new Set<string>()

export function reportError(error: unknown, source: string) {
  try {
    if (typeof window === "undefined" || seen.size >= MAX_PER_VISIT) return
    const err = error instanceof Error ? error : new Error(String(error))
    const message = (err.message || "Unknown error").slice(0, 500)
    // Connection problems are expected on a phone, not bugs.
    if (!navigator.onLine || /Failed to fetch|NetworkError|Load failed|AbortError/i.test(message)) return
    const key = `${source}:${message}`
    if (seen.has(key)) return
    seen.add(key)
    void supabase
      .from("client_errors")
      .insert({
        source: source.slice(0, 40),
        message,
        stack: err.stack?.slice(0, 4000) ?? null,
        url: window.location.pathname.slice(0, 300),
        user_agent: navigator.userAgent.slice(0, 300),
      })
      .then(() => {}, () => {})
  } catch {
    /* logging must never break the app */
  }
}
