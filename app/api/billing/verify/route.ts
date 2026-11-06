import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/serverAuth"
import { getAdminClient } from "../../../../lib/supabaseAdmin"
import { confirmPayment } from "../../../../lib/billing"

// Called by the browser after Flutterwave sends the student back to Lunara.
// It re-checks the payment with Flutterwave, so the redirect itself is not trusted.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  let txRef: unknown
  try {
    txRef = (await req.json())?.txRef
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  if (typeof txRef !== "string" || !txRef) {
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })
  }

  // A student may only confirm their own payments.
  const db = getAdminClient()
  if (!db) return NextResponse.json({ error: "Payments are not set up on the server yet." }, { status: 500 })
  const { data: payment } = await db.from("payments").select("user_id").eq("tx_ref", txRef).maybeSingle()
  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 })
  }

  const result = await confirmPayment(txRef)
  if (!result.ok) {
    const status = result.reason === "server" ? 500 : 202
    return NextResponse.json({ confirmed: false, reason: result.reason }, { status })
  }
  return NextResponse.json({ confirmed: true })
}
