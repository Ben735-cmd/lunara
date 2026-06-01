"use client"

import { useEffect, useState } from "react"

import Dashboard from "@/components/dashboard/Dashboard"
import AuthForm from "@/components/auth/AuthForm"

import { supabase } from "@/lib/supabase"

export default function Home() {
  const [loading, setLoading] =
    useState(true)

  const [userEmail, setUserEmail] =
    useState("")

  useEffect(() => {
    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserEmail(
            session.user.email || ""
          )
        } else {
          setUserEmail("")
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUserEmail(user.email || "")
    }

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!userEmail) {
    return <AuthForm />
  }

  return (
    <Dashboard
      email={userEmail}
      logout={logout}
    />
  )
}