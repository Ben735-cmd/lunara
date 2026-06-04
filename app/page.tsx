"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import AuthForm from "../components/auth/AuthForm"
import Dashboard from "../components/dashboard/Dashboard"

export default function Page() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
      setLoading(false)
    })

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  function logout() {
    supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!email) {
    return <AuthForm />
  }

  return <Dashboard email={email} logout={logout} />
}