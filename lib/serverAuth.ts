import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"

/** Reads the signed-in student from the `Authorization: Bearer <token>` header. SERVER ONLY. */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !anon) return null

  const supabase = createClient(url, anon)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error || !user ? null : user
}
