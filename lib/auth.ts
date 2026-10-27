import { supabase } from "./supabase"

/**
 * The signed-in user, read from the locally stored session. This does not call
 * the Supabase server, so it returns instantly. Database and storage rules
 * (Row Level Security) still check the real token on every request, so this is
 * safe for choosing which rows to ask for.
 *
 * `supabase.auth.getUser()` makes a network round trip every time, which adds
 * up to seconds on a slow connection when several screens call it.
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
