"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import dynamic from "next/dynamic"
import { AppSkeleton } from "../components/ui/Skeleton"

// Signed-out visitors never download the dashboard, and signed-in users never
// download the sign-in screen.
const AuthForm = dynamic(() => import("../components/auth/AuthForm"), { loading: () => <AppSkeleton /> })
const ResetPassword = dynamic(() => import("../components/auth/ResetPassword"), { loading: () => <AppSkeleton /> })
const Dashboard = dynamic(() => import("../components/dashboard/Dashboard"), { loading: () => <AppSkeleton /> })

export default function Page() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // True after someone opens the reset link from their email
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
      if (window.location.hash.includes("type=recovery")) setRecovering(true)
      setLoading(false)
    })

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") setRecovering(true)
        setEmail(session?.user?.email ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  function logout() {
    supabase.auth.signOut()
  }

  if (loading) {
    return <AppSkeleton />
  }

  if (email && recovering) {
    return <ResetPassword onDone={() => setRecovering(false)} />
  }

  if (!email) {
    return <AuthForm />
  }

  return <Dashboard email={email} logout={logout} />
}