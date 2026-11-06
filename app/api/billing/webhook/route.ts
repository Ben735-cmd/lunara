import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { confirmPayment } from "../../../../lib/billing"

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Flutterwave calls this whenever a payment finishes, even if the student closed
// the tab before being redirected. Set the URL and the "secret hash" in the
// Flutterwave dashboard (Settings > Webhooks); the hash must equal FLW_SECRET_HASH.
export async function POST(req: NextRequest) {
  const expected = process.env.FLW_SECRET_HASH
  const sent = req.headers.get("verif-hash")
  if (!expected || !sent || !sameSecret(sent, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { event?: string; data?: { tx_ref?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const txRef = body?.data?.tx_ref
  if (body?.event === "charge.completed" && typeof txRef === "string") {
    // confirmPayment asks Flutterwave directly, so a forged body cannot grant a plan.
    const result = await confirmPayment(txRef)
    // A 500 makes Flutterwave retry the webhook later.
    if (!result.ok && result.reason === "server") {
      return NextResponse.json({ error: "Try again later" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
