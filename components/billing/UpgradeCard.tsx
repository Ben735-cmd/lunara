"use client"

import { useCallback, useEffect, useState } from "react"
import { Crown } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { PLANS } from "../../lib/plans"

type Subscription = { plan: string; status: string; current_period_end: string | null }

const PLAN = PLANS.premium_month

function isActive(sub: Subscription | null): boolean {
  return !!sub && sub.status === "active" && !!sub.current_period_end && new Date(sub.current_period_end) > new Date()
}

/**
 * Shows the student's plan and starts a Flutterwave payment. When Flutterwave
 * sends the student back to Lunara, this also confirms the payment with the server.
 */
export default function UpgradeCard({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  // Row Level Security returns only this student's own row.
  const fetchSubscription = useCallback(async (): Promise<Subscription | null> => {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle()
    return data ?? null
  }, [userId])

  const showSubscription = useCallback((next: Subscription | null) => {
    setSub(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Stripping the query string stops a refresh from re-checking the same payment.
    const params = new URLSearchParams(window.location.search)
    const txRef = params.get("tx_ref")
    const returned = params.get("billing") === "return" && txRef
    if (!returned) {
      fetchSubscription().then(showSubscription)
      return
    }

    window.history.replaceState({}, "", window.location.pathname)
    if (params.get("status") === "cancelled") {
      fetchSubscription().then((next) => {
        setMessage("Payment cancelled. You have not been charged.")
        showSubscription(next)
      })
      return
    }

    let cancelled = false
    ;(async () => {
      setBusy(true)
      setMessage("Confirming your payment...")
      const { data: { session } } = await supabase.auth.getSession()
      // The webhook can land a moment after the redirect, so try a few times.
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        const res = await fetch("/api/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ txRef }),
        }).catch(() => null)
        const body = res ? await res.json().catch(() => null) : null
        if (body?.confirmed) {
          if (!cancelled) setMessage("Payment received. Premium is now active.")
          break
        }
        if (attempt === 4 && !cancelled) {
          setMessage("We could not confirm the payment yet. If you were charged, it will appear here shortly.")
        } else {
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      if (!cancelled) {
        showSubscription(await fetchSubscription())
        setBusy(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchSubscription, showSubscription])

  async function subscribe() {
    setBusy(true)
    setMessage("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ plan: PLAN.id }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.link) {
        setMessage(body?.error ?? "Could not start the payment. Try again.")
        setBusy(false)
        return
      }
      window.location.href = body.link
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.")
      setBusy(false)
    }
  }

  const active = isActive(sub)
  const until = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : ""

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
        <Crown size={18} aria-hidden="true" className={active ? "text-accent" : "text-ink-muted"} />
        Lunara Premium
      </h2>

      {loading ? (
        <p className="text-sm text-ink-muted">Checking your plan...</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink-muted">
            {active
              ? `Premium is active until ${until}. Renew any time and the days are added on top.`
              : `${PLAN.currency} ${PLAN.amount} for ${PLAN.days} days. Pay by card or mobile money.`}
          </p>
          <button
            onClick={subscribe}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait..." : active ? "Renew Premium" : "Get Premium"}
          </button>
        </>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          {message}
        </p>
      )}
    </div>
  )
}
