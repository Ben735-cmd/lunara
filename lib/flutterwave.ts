// Thin wrapper around the Flutterwave v3 REST API. SERVER ONLY (uses the secret key).
// Docs: https://developer.flutterwave.com/docs

const BASE = "https://api.flutterwave.com/v3"

function secretKey(): string | null {
  return process.env.FLW_SECRET_KEY ?? null
}

export function flutterwaveReady(): boolean {
  return Boolean(secretKey())
}

type CheckoutInput = {
  txRef: string
  amount: number
  currency: string
  redirectUrl: string
  email: string
  name?: string
  title: string
  description: string
  meta: Record<string, string>
}

/** Asks Flutterwave for a hosted payment page. Returns its link, or null on failure. */
export async function createCheckoutLink(input: CheckoutInput): Promise<string | null> {
  const key = secretKey()
  if (!key) return null

  const res = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      // Card plus Zambian mobile money. Remove one here if you only want the other.
      payment_options: "card,mobilemoneyzambia",
      customer: { email: input.email, name: input.name ?? input.email },
      customizations: { title: input.title, description: input.description },
      meta: input.meta,
    }),
  })

  if (!res.ok) {
    console.error("Flutterwave checkout failed:", res.status, await res.text().catch(() => ""))
    return null
  }
  const json = (await res.json()) as { status?: string; data?: { link?: string } }
  return json.status === "success" && json.data?.link ? json.data.link : null
}

export type VerifiedTransaction = {
  id: number
  tx_ref: string
  status: string
  amount: number
  currency: string
}

/**
 * Asks Flutterwave directly what happened to a payment. This is the only source
 * we trust: a redirect or webhook body on its own could be faked.
 */
export async function verifyByReference(txRef: string): Promise<VerifiedTransaction | null> {
  const key = secretKey()
  if (!key) return null

  const res = await fetch(`${BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = (await res.json()) as { status?: string; data?: VerifiedTransaction }
  return json.status === "success" && json.data ? json.data : null
}
