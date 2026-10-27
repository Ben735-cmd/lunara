"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import Logo from "../ui/Logo"
import AnimatedBackground from "../ui/AnimatedBackground"

// Shown after someone opens the reset link from their email. Supabase has
// already signed them in with a temporary session; this sets the new password.
export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    if (password.length < 8) {
      setError("Use at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("The two passwords do not match.")
      return
    }
    setLoading(true)
    setError("")
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    // Remove the token from the address bar, then continue into the app.
    window.history.replaceState(null, "", window.location.pathname)
    onDone()
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <AnimatedBackground />
      <form
        onSubmit={(e) => { e.preventDefault(); save() }}
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-7"
      >
        <Logo size={36} className="mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Set a new password</h1>
        <p className="mt-2 text-sm text-ink-muted">Choose a password you have not used before.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save password"}
        </button>
      </form>
    </main>
  )
}
