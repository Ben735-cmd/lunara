import { supabase } from "./supabase"

// Anonymous usage counts: which screens get opened. No name, email or account id
// is stored, only a random id kept on this device so visits can be counted.
const DEVICE_KEY = "lunara-device"

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return "unknown"
  }
}

let last = ""

export function trackScreen(name: string) {
  try {
    if (typeof window === "undefined" || name === last) return
    last = name
    void supabase.from("usage_events").insert({ device_id: deviceId(), name: name.slice(0, 60) }).then(() => {}, () => {})
  } catch {
    /* analytics must never break the app */
  }
}
