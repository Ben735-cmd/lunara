"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert(
        "Account created! Check your email to confirm your account."
      )
    }
  }

  async function signIn() {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    console.log(data)

    if (error) {
      alert(error.message)
    } else {
      alert("Logged in successfully!")
      window.location.reload()
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center px-6">
      {/* Background Glow */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-[32px] p-10 shadow-2xl">
        {/* Logo */}
        <div className="mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-lg shadow-purple-500/30">
            L
          </div>

          <h1 className="text-4xl font-bold text-white text-center mt-6">
            Lunara
          </h1>

          <p className="text-[#94A3B8] text-center mt-2">
            Smarter learning for modern students
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <label className="text-sm text-[#CBD5E1] mb-2 block">
              Email
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-[#CBD5E1] mb-2 block">
              Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-[#64748B] outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 space-y-3">
            <button
              onClick={signIn}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl py-4 font-semibold hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-purple-500/20"
            >
              Login
            </button>

            <button
              onClick={signUp}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 font-semibold hover:bg-white/10 transition"
            >
              Create Account
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