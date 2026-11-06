import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getUserFromRequest } from "../../../../lib/serverAuth"
import { getAdminClient } from "../../../../lib/supabaseAdmin"
import { createCheckoutLink, flutterwaveReady } from "../../../../lib/flutterwave"
import { getPlan } from "../../../../lib/plans"

// Starts a payment: records a pending payment, asks Flutterwave for a checkout
// page and returns its link for the browser to open.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const db = getAdminClient()
  if (!db || !flutterwaveReady()) {
    return NextResponse.json({ error: "Payments are not set up on the server yet." }, { status: 500 })
  }

  let planId: unknown
  try {
    planId = (await req.json())?.plan
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const plan = getPlan(planId)
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 })

  const txRef = `lunara-${randomUUID()}`

  const { error: insertError } = await db.from("payments").insert({
    tx_ref: txRef,
    user_id: user.id,
    plan: plan.id,
    amount: plan.amount,
    currency: plan.currency,
    status: "pending",
  })
  if (insertError) {
    console.error("Could not record payment:", insertError.message)
    return NextResponse.json({ error: "Could not start the payment. Try again." }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const link = await createCheckoutLink({
    txRef,
    amount: plan.amount,
    currency: plan.currency,
    redirectUrl: `${origin}/?billing=return`,
    email: user.email ?? "",
    name: (user.user_metadata?.full_name as string | undefined) ?? undefined,
    title: "Lunara Premium",
    description: plan.name,
    meta: { user_id: user.id, plan: plan.id },
  })

  if (!link) {
    await db.from("payments").update({ status: "failed" }).eq("tx_ref", txRef)
    return NextResponse.json({ error: "The payment page could not be opened. Try again." }, { status: 502 })
  }

  return NextResponse.json({ link, txRef })
}
