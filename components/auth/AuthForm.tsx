"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function signUp() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      alert(error.message)
    } else {
      alert("Account created! Check your email to confirm your account.")
    }
    setLoading(false)
  }

  async function signIn() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
    } else {
      window.location.reload()
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
      alert(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Background Glows */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-[32px] p-10 shadow-2xl">

        {/* Logo */}
        <div className="mb-10 text-center">
          <img
            src="/icons/icon-128x128.png"
            alt="Lunara"
            style={{ width: "72px", height: "72px", borderRadius: "20px", margin: "0 auto", boxShadow: "0 8px 32px rgba(139,92,246,0.4)" }}
          />
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-4xl font-black text-white text-center mt-5">
            Lunara
          </h1>
          <p className="text-[#94A3B8] text-center mt-2 text-sm">
            Focus. Organize. Achieve.
          </p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={signInWithGoogle}
          disabled={googleLoading}
          style={{
            width: "100%",
            background: "white",
            border: "none",
            borderRadius: "16px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "#1E293B",
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.7 : 1,
            marginBottom: "24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            transition: "all 0.2s",
          }}
        >
          {googleLoading ? (
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <p style={{ color: "#475569", fontSize: "0.8rem", fontWeight: 500 }}>or sign in with email</p>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Email & Password */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#CBD5E1] mb-2 block">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-[#CBD5E1] mb-2 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 space-y-3">
            <button 
              onClick={signIn}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl py-4 font-semibold hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-purple-500/20"
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <button
              onClick={signUp}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 font-semibold hover:bg-white/10 transition"
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#64748B] text-sm mt-8">
          Built for ambitious university students 🚀
        </p>
      </div>
    </main>
  )
}