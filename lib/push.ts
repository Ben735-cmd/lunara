import { supabase } from "./supabase"

export type PushState = "unsupported" | "denied" | "off" | "on"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

function keyToBytes(base64: string) {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Whether this device can get reminders and whether they are switched on. */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return "unsupported"
  if (Notification.permission === "denied") return "denied"
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub && Notification.permission === "granted" ? "on" : "off"
  } catch {
    return "off"
  }
}

/** Asks permission, subscribes this device and saves it so the server can reach it. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return "unsupported"
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "off"

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }))

  const json = sub.toJSON()
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth_key: json.keys?.auth ?? "" },
    { onConflict: "endpoint" }
  )
  if (error) throw new Error(error.message)
  return "on"
}

/** Stops reminders on this device. */
export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
    await sub.unsubscribe()
  }
  return Notification.permission === "denied" ? "denied" : "off"
}

/** Sends a test notification to the student's own devices. Returns an error message, or null on success. */
export async function sendTestNotification(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return "Sign in again and retry."
  try {
    const res = await fetch("/api/push/test", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return body.error || "The test could not be sent."
    return null
  } catch {
    return "The test could not be sent. Check your connection."
  }
}
