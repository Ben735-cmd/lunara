import webpush from "web-push"

export type PushTarget = { endpoint: string; p256dh: string; auth_key: string }
export type PushMessage = { title: string; body: string; url?: string; tag?: string }

let configured = false

/** Sets up the VAPID keys once. Returns false when the keys are not configured. */
export function pushReady(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

/** Sends one notification. Returns "ok", "gone" (the device unsubscribed) or "failed". */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<"ok" | "gone" | "failed"> {
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth_key } },
      JSON.stringify(message),
      { TTL: 60 * 30, urgency: "high" }
    )
    return "ok"
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    return status === 404 || status === 410 ? "gone" : "failed"
  }
}
