import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { pushReady, sendPush } from "../../../../lib/pushServer"

// Sends a test notification to the signed-in student's own devices, so they can
// check that reminders will reach them.
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !anon) return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  if (!pushReady()) return NextResponse.json({ error: "Notifications are not set up on the server" }, { status: 500 })

  // Rules in the database make this return only the caller's own devices.
  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth_key")
  if (error) return NextResponse.json({ error: "Could not read your devices" }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: "No device is signed up yet" }, { status: 404 })

  let sent = 0
  for (const sub of data) {
    const result = await sendPush(sub, {
      title: "Lunara reminders are on",
      body: "You will get a notification before each study session.",
      url: "/",
      tag: "lunara-test",
    })
    if (result === "ok") sent++
    if (result === "gone") await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
  }
  return NextResponse.json({ sent })
}
