"use client"

import { useEffect } from "react"
import { reportError } from "../lib/errorLog"

export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { reportError(error, "global-error") }, [error])
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <button onClick={() => unstable_retry()} style={{ padding: "10px 18px", borderRadius: 8, background: "#0e7c5a", color: "#fff", border: 0, fontSize: 14 }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
