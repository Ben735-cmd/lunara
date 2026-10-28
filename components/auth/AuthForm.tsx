"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { BookOpen, Calculator, CalendarDays, Layers, NotebookText, Sparkles } from "lucide-react"
import CardPreview from "./CardPreview"
import Logo from "../ui/Logo"
import AnimatedBackground from "../ui/AnimatedBackground"

const hubFeatures = [
  { Icon: BookOpen, label: "Courses and documents" },
  { Icon: Sparkles, label: "AI summaries and quizzes" },
  { Icon: Layers, label: "Spaced-repetition flashcards" },
  { Icon: NotebookText, label: "Notes" },
  { Icon: CalendarDays, label: "Assignments and calendar" },
  { Icon: Calculator, label: "Question solver" },
]

type Notice = { kind: "error" | "success"; text: string } | null

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  async function signUp() {
    if (!email || !password) {
      setNotice({ kind: "error", text: "Enter your email and a password to create an account." })
      return
    }
    setLoading(true)
    setNotice(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setNotice({ kind: "error", text: error.message })
    } else {
      setNotice({ kind: "success", text: "Account created. Check your email to confirm it, then sign in." })
    }
    setLoading(false)
  }

  async function signIn() {
    if (!email || !password) {
      setNotice({ kind: "error", text: "Enter your email and password to sign in." })
      return
    }
    setLoading(true)
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setNotice({ kind: "error", text: error.message })
    } else {
      window.location.reload()
    }
    setLoading(false)
  }

  async function forgotPassword() {
    if (!email) {
      setNotice({ kind: "error", text: "Enter your email above, then choose Forgot password." })
      return
    }
    setLoading(true)
    setNotice(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) {
      setNotice({ kind: "error", text: error.message })
    } else {
      // Same message whether or not the email has an account, so nobody can use this to find out who is registered.
      setNotice({ kind: "success", text: "If an account exists for that email, we have sent a link to reset the password." })
    }
    setLoading(false)
  }

  async function signInWithGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setNotice({ kind: "error", text: error.message })
      setGoogleLoading(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <main className="relative isolate min-h-screen bg-paper lg:grid lg:grid-cols-2">
      <AnimatedBackground />
      {/* Left: what the app does, shown with a real flashcard */}
      <section className="hidden flex-col border-r border-line bg-accent-tint px-16 py-12 lg:flex xl:px-24">
        <Logo size={40} />
        <div className="my-auto py-12">
          <h1 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight text-ink">
            Your whole semester, in one place.
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-ink-muted">
            Keep your courses, notes, assignments and deadlines together.
            Upload your materials and Lunara turns them into summaries,
            quizzes and flashcards, with an AI assistant for when you get stuck.
          </p>
          <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-4 gap-y-3">
            {hubFeatures.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-ink">
                <Icon size={18} aria-hidden="true" className="shrink-0 text-accent" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <CardPreview />
          </div>
        </div>
      </section>

      {/* Right: sign in */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          <Logo size={36} className="mb-8 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in to Lunara</h2>
          <p className="mt-2 text-sm text-ink-muted">New to Lunara? Choose Create account.</p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[0.95rem] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <p className="text-sm text-ink-muted">or use email</p>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              signIn()
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-ink">Password</label>
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={loading}
                  className="text-sm font-medium text-accent-strong underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {notice && (
              <p
                role="status"
                className={`rounded-lg px-3.5 py-2.5 text-sm ${
                  notice.kind === "error"
                    ? "bg-danger-tint text-danger"
                    : "bg-accent-tint text-accent-strong"
                }`}
              >
                {notice.text}
              </p>
            )}

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : "Sign in"}
              </button>
              <button
                type="button"
                onClick={signUp}
                disabled={loading}
                className="w-full rounded-lg border border-line bg-surface px-4 py-3 font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create account
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs leading-relaxed text-ink-muted">
            By continuing you agree to how Lunara handles your data in the{" "}
            <Link href="/privacy" className="font-medium text-accent-strong underline">privacy policy</Link>.
            {" "}Made by{" "}
            <Link href="/about" className="font-medium text-accent-strong underline">Ben Lubona</Link>.
          </p>
        </div>
      </section>
    </main>
  )
}
