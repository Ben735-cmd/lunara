import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

/** AI requests each person gets per day. Change it in Vercel with AI_DAILY_LIMIT, no code change needed. */
export const AI_DAILY_LIMIT = Math.max(1, Number(process.env.AI_DAILY_LIMIT) || 30)

export type AiUsage = { used: number; limit: number; remaining: number }

const usage = (used: number): AiUsage => ({ used, limit: AI_DAILY_LIMIT, remaining: Math.max(AI_DAILY_LIMIT - used, 0) })

// A client that acts as the signed-in person, so the database rules see who is asking.
function asUser(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function bearerToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
}

/** Signed-in check without using up a request. */
export async function usedToday(token: string): Promise<AiUsage | null> {
  const { data, error } = await asUser(token).rpc("ai_used_today")
  if (error || typeof data !== "number") return null
  return usage(data)
}

/**
 * Uses one request. `blocked` is a ready-made reply when the person must not continue
 * (not signed in, or out of requests today). If the limit check itself breaks we let the
 * request through rather than take the AI down for everyone.
 */
export async function takeRequest(token: string): Promise<{ blocked: NextResponse | null; usage: AiUsage | null }> {
  if (!token) {
    return { blocked: NextResponse.json({ error: "You must be logged in to use the AI." }, { status: 401 }), usage: null }
  }
  const { data, error } = await asUser(token).rpc("consume_ai_request", { p_limit: AI_DAILY_LIMIT })
  if (error) {
    const status = (error as { code?: string }).code
    if (/not signed in|JWT|401/i.test(error.message) || status === "PGRST301") {
      return { blocked: NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 }), usage: null }
    }
    console.error("AI limit check failed:", error.message)
    return { blocked: null, usage: null }
  }
  const result = data as { allowed: boolean; used: number }
  if (!result.allowed) {
    return {
      blocked: NextResponse.json(
        { error: `You have used all ${AI_DAILY_LIMIT} AI requests for today. They come back at midnight.`, usage: usage(result.used) },
        { status: 429 }
      ),
      usage: usage(result.used),
    }
  }
  return { blocked: null, usage: usage(result.used) }
}

/** Gives the request back when the AI failed, so people are not charged for errors. */
export async function refundRequest(token: string) {
  try { await asUser(token).rpc("refund_ai_request") } catch {}
}
