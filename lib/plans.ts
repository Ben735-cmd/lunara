/**
 * The plans a student can buy. The server decides the price from this list;
 * the browser only ever says which plan it wants, never how much to pay.
 */
export type PlanId = "premium_month"

export type Plan = {
  id: PlanId
  name: string
  amount: number
  currency: string
  days: number
}

export const PLANS: Record<PlanId, Plan> = {
  premium_month: {
    id: "premium_month",
    name: "Lunara Premium (1 month)",
    // Test-mode price. Change it before going live.
    amount: 30,
    currency: "ZMW",
    days: 30,
  },
}

export function getPlan(id: unknown): Plan | null {
  return typeof id === "string" && id in PLANS ? PLANS[id as PlanId] : null
}
