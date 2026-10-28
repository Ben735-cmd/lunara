import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { pushReady, sendPush } from "../../../../lib/pushServer"

// Called once a minute by a scheduled job in Supabase. It finds study sessions
// whose reminder time has arrived and sends a push notification to each device
// the student has signed up.
export const maxDuration = 30

type Due = { sid: string; uid: string; stitle: string; sstarts: string; mins: number; endpoint: string; p256dh: string; auth_key: string }

function reminderText(title: string, startsAt: string, mins: number) {
  const time = new Date(startsAt)
  const clock = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" })
  const when = mins <= 0 ? "is starting now" : `starts in ${mins} minute${mins === 1 ? "" : "s"}`
  return { title: `Study time: ${title}`, body: `Your session ${when} (${clock}).` }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon || !pushReady()) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 500 })
  }

  const supabase = createClient(url, anon)
  const { data, error } = await supabase.rpc("claim_due_reminders", { p_secret: secret })
  if (error) {
    console.error("claim_due_reminders failed:", error.message)
    return NextResponse.json({ error: "Could not read reminders" }, { status: 500 })
  }

  const due = (data ?? []) as Due[]
  let sent = 0
  await Promise.all(
    due.map(async (row) => {
      const { title, body } = reminderText(row.stitle, row.sstarts, row.mins)
      const result = await sendPush(row, { title, body, url: "/", tag: `session-${row.sid}` })
      if (result === "ok") sent++
      if (result === "gone") await supabase.rpc("drop_push_endpoint", { p_secret: secret, p_endpoint: row.endpoint })
    })
  )
  return NextResponse.json({ due: due.length, sent })
}
