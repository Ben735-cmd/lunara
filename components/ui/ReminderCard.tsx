"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { disablePush, enablePush, getPushState, sendTestNotification, type PushState } from "../../lib/push"

/**
 * Switches push notifications on or off for this device and can send a test.
 * Used wherever the app promises a reminder (timetable, focus timer).
 */
export default function ReminderCard({
  userId,
  description,
  onChange,
}: {
  userId: string
  description: string
  onChange?: (state: PushState) => void
}) {
  const [state, setState] = useState<PushState | "loading">("loading")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    getPushState().then((s) => {
      if (cancelled) return
      setState(s)
      onChange?.(s)
    })
    return () => { cancelled = true }
    // onChange is a callback from the parent; only the first check matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(next: PushState) {
    setState(next)
    onChange?.(next)
  }

  async function turnOn() {
    setBusy(true)
    setMessage("")
    try {
      update(await enablePush(userId))
    } catch {
      setMessage("Could not turn on reminders. Check your connection and try again.")
    }
    setBusy(false)
  }

  async function turnOff() {
    setBusy(true)
    setMessage("")
    update(await disablePush())
    setBusy(false)
  }

  async function test() {
    setBusy(true)
    setMessage("")
    const problem = await sendTestNotification()
    setMessage(problem ?? "Sent. It should arrive in a few seconds.")
    setBusy(false)
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
        {state === "on" ? <Bell size={18} aria-hidden="true" className="text-accent" /> : <BellOff size={18} aria-hidden="true" className="text-ink-muted" />}
        Reminders
      </h2>
      {state === "loading" && <p className="text-sm text-ink-muted">Checking...</p>}
      {state === "unsupported" && (
        <p className="text-sm leading-relaxed text-ink-muted">
          This browser can&apos;t send reminders. On iPhone, add Lunara to your Home Screen first, then open it from there.
        </p>
      )}
      {state === "denied" && (
        <p className="text-sm leading-relaxed text-ink-muted">
          Notifications are blocked for Lunara. Allow them in your browser&apos;s site settings, then come back here.
        </p>
      )}
      {state === "off" && (
        <>
          <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
          <button
            onClick={turnOn}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Turning on..." : "Turn on reminders"}
          </button>
        </>
      )}
      {state === "on" && (
        <>
          <p className="text-sm leading-relaxed text-ink-muted">Reminders are on for this device.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={test}
              disabled={busy}
              className="flex-1 rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
            >
              Send a test
            </button>
            <button
              onClick={turnOff}
              disabled={busy}
              className="flex-1 rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-60"
            >
              Turn off
            </button>
          </div>
        </>
      )}
      {message && <p role="status" className="mt-3 text-xs text-ink-muted">{message}</p>}
    </div>
  )
}
