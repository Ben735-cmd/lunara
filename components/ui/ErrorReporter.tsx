"use client"

import { useEffect } from "react"
import { reportError } from "../../lib/errorLog"

/** Listens for crashes that no screen caught and saves them to the crash log. */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message, "window-error")
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason, "unhandled-promise")
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
