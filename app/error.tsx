"use client"

// Shown instead of a blank white page if something fails while the app loads.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Try again, or update your browser if this keeps happening.</p>
      <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 8, background: "#0e7c5a", color: "#fff", border: 0, fontSize: 14 }}>
        Reload
      </button>
    </div>
  )
}
