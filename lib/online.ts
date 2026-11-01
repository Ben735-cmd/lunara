"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/** True while the device has a connection. Starts as true on the server so the first paint matches. */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
