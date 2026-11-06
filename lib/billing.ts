import { getAdminClient } from "./supabaseAdmin"
import { verifyByReference } from "./flutterwave"
import { getPlan } from "./plans"

export type ConfirmResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; reason: "unknown_payment" | "not_successful" | "mismatch" | "server" }

/**
 * Checks a payment with Flutterwave and, if it really succeeded, gives the
 * student their plan. Safe to call more than once for the same payment (the
 * browser redirect and the webhook both call it): the plan is only extended once.
 */
export async function confirmPayment(txRef: string): Promise<ConfirmResult> {
  const db = getAdminClient()
  if (!db) return { ok: false, reason: "server" }

  const { data: payment } = await db.from("payments").select("*").eq("tx_ref", txRef).maybeSingle()
  if (!payment) return { ok: false, reason: "unknown_payment" }
  if (payment.status === "successful") return { ok: true, alreadyDone: true }

  const plan = getPlan(payment.plan)
  if (!plan) return { ok: false, reason: "mismatch" }

  const tx = await verifyByReference(txRef)
  if (!tx || tx.status !== "successful") return { ok: false, reason: "not_successful" }

  // The amount and currency must match what we asked for, not what the browser said.
  if (tx.tx_ref !== txRef || tx.currency !== payment.currency || Number(tx.amount) < Number(payment.amount)) {
    await db.from("payments").update({ status: "failed" }).eq("tx_ref", txRef).eq("status", "pending")
    return { ok: false, reason: "mismatch" }
  }

  // Claim the payment. Only the caller that flips pending -> successful extends
  // the plan, so a webhook and a redirect arriving together cannot double-credit.
  const { data: claimed } = await db
    .from("payments")
    .update({ status: "successful", flw_transaction_id: String(tx.id), paid_at: new Date().toISOString() })
    .eq("tx_ref", txRef)
    .neq("status", "successful")
    .select("tx_ref")
  if (!claimed?.length) return { ok: true, alreadyDone: true }

  const { data: existing } = await db
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", payment.user_id)
    .maybeSingle()

  // Renewing early adds time on top of what is left instead of wasting it.
  const now = Date.now()
  const currentEnd = existing?.current_period_end ? new Date(existing.current_period_end).getTime() : 0
  const start = Math.max(now, currentEnd)
  const newEnd = new Date(start + plan.days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await db.from("subscriptions").upsert({
    user_id: payment.user_id,
    plan: plan.id,
    status: "active",
    current_period_end: newEnd,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error("Could not save subscription:", error.message)
    // Put the payment back so a retry (or the webhook) can try again.
    await db.from("payments").update({ status: "pending" }).eq("tx_ref", txRef)
    return { ok: false, reason: "server" }
  }

  return { ok: true, alreadyDone: false }
}
