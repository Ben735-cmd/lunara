"use client"

import { useState } from "react"

export default function QuestionSolver() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [solution, setSolution] = useState("")
  const [extractedText, setExtractedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showExtracted, setShowExtracted] = useState(false)

  function handleFileChange(f: File) {
    setFile(f)
    setSolution("")
    setExtractedText("")
    setError("")

    if (f.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  async function solve() {
    if (!file) return
    setLoading(true)
    setSolution("")
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/solve", { method: "POST", body: formData })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSolution(data.solution)
        if (data.extractedText) setExtractedText(data.extractedText)
      }
    } catch (err) {
      setError("Failed to connect to server.")
    }

    setLoading(false)
  }

  function formatSolution(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1rem", fontWeight: 700,
            color: "#0F172A", marginTop: "20px", marginBottom: "8px",
          }}>{line.replace("## ", "")}</h3>
        )
      }
      if (line.match(/^\d+\./)) {
        return (
          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
            <span style={{
              background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
              color: "white", borderRadius: "50%",
              width: "24px", height: "24px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.72rem", fontWeight: 700,
            }}>{line.match(/^\d+/)?.[0]}</span>
            <p style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {line.replace(/^\d+\.\s*/, "")}
            </p>
          </div>
        )
      }
      if (line.trim() === "") return <div key={i} style={{ height: "4px" }} />
      return <p key={i} style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "6px" }}>{line}</p>
    })
  }

  return (
    <main style={{ flex: 1, background: "#F0F2FF", padding: "44px 48px", overflowY: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
        .drop-zone:hover { border-color: rgba(139,92,246,0.5) !important; background: rgba(139,92,246,0.04) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>AI Powered</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.5rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>Question Solver 🧮</h1>
        <p style={{ color: "#94A3B8", marginTop: "8px" }}>Upload a PDF, Word doc, or photo of your question and get a full solution</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

        {/* Upload Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "white", borderRadius: "28px", padding: "32px",
            border: "1.5px solid #F1F5F9",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#0F172A", marginBottom: "20px" }}>Upload Question</h2>

            {/* Drop Zone */}
            <div
              className="drop-zone"
              onClick={() => document.getElementById("question-upload")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileChange(f)
              }}
              style={{
                border: "2px dashed #E2E8F0",
                borderRadius: "20px", padding: "40px 20px",
                textAlign: "center", cursor: "pointer",
                transition: "all 0.2s",
                background: file ? "rgba(139,92,246,0.03)" : "transparent",
              }}
            >
              {file ? (
                <div>
                  <p style={{ fontSize: "2rem", marginBottom: "8px" }}>
                    {file.type.startsWith("image/") ? "🖼️" : file.name.endsWith(".pdf") ? "📄" : "📝"}
                  </p>
                  <p style={{ fontWeight: 600, color: "#7C3AED", fontSize: "0.9rem" }}>{file.name}</p>
                  <p style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: "4px" }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📤</p>
                  <p style={{ fontWeight: 600, color: "#334155", fontSize: "0.95rem" }}>Drop your file here</p>
                  <p style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "6px" }}>PDF, Word (.docx), or Image (JPG, PNG)</p>
                </div>
              )}
              <input
                id="question-upload"
                type="file"
                accept=".pdf,.docx,image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }}
              />
            </div>

            {/* Supported formats */}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              {["📄 PDF", "📝 Word (.docx)", "🖼️ JPG / PNG"].map((fmt) => (
                <span key={fmt} style={{
                  background: "rgba(139,92,246,0.06)",
                  border: "1px solid rgba(139,92,246,0.15)",
                  color: "#7C3AED", borderRadius: "8px",
                  padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600,
                }}>{fmt}</span>
              ))}
            </div>

            {/* Image Preview */}
            {preview && (
              <div style={{ marginTop: "20px" }}>
                <p style={{ color: "#94A3B8", fontSize: "0.78rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</p>
                <img
                  src={preview}
                  alt="Question preview"
                  style={{ width: "100%", borderRadius: "16px", border: "1.5px solid #F1F5F9", maxHeight: "300px", objectFit: "contain" }}
                />
              </div>
            )}

            {/* Solve Button */}
            <button
              onClick={solve}
              disabled={!file || loading}
              style={{
                width: "100%", marginTop: "20px",
                background: !file || loading ? "#E2E8F0" : "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                border: "none", borderRadius: "16px", padding: "16px",
                color: !file || loading ? "#94A3B8" : "white",
                fontWeight: 700, fontSize: "1rem",
                cursor: !file || loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !file || loading ? "none" : "0 4px 16px rgba(139,92,246,0.3)",
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  Solving...
                </span>
              ) : "🧮 Solve Question"}
            </button>
          </div>

          {/* Tips */}
          <div style={{
            background: "linear-gradient(135deg, #7C3AED, #2563EB)",
            borderRadius: "24px", padding: "24px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "12px" }}>💡 Tips for best results</p>
            {[
              "Make sure the image is clear and well-lit",
              "Crop the image to show just the question",
              "For PDF/Word, include all parts of the question",
              "Works with math, science, essays and more",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>→</span>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Solution Panel */}
        <div style={{
          background: "white", borderRadius: "28px", padding: "32px",
          border: "1.5px solid #F1F5F9",
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          minHeight: "500px",
        }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#0F172A", marginBottom: "20px" }}>Solution</h2>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
              <p style={{ color: "#EF4444", fontSize: "0.875rem", fontWeight: 500 }}>⚠️ {error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "#94A3B8", fontWeight: 500 }}>AI is solving your question...</p>
              <p style={{ color: "#CBD5E1", fontSize: "0.8rem" }}>This may take a few seconds</p>
            </div>
          )}

          {/* Solution */}
          {solution && !loading && (
            <div className="fade-in">
              {/* Extracted text toggle for PDF/Word */}
              {extractedText && (
                <div style={{ marginBottom: "20px" }}>
                  <button
                    onClick={() => setShowExtracted(!showExtracted)}
                    style={{
                      background: "rgba(139,92,246,0.06)",
                      border: "1px solid rgba(139,92,246,0.15)",
                      color: "#7C3AED", borderRadius: "10px",
                      padding: "6px 14px", fontSize: "0.78rem",
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >{showExtracted ? "Hide" : "Show"} extracted text</button>

                  {showExtracted && (
                    <div style={{ background: "#F8FAFC", borderRadius: "14px", padding: "16px", marginTop: "10px", maxHeight: "150px", overflowY: "auto" }}>
                      <p style={{ color: "#64748B", fontSize: "0.8rem", lineHeight: 1.7 }}>{extractedText}</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ lineHeight: 1.7 }}>
                {formatSolution(solution)}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!solution && !loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" }}>
              <p style={{ fontSize: "3rem", marginBottom: "16px" }}>🧮</p>
              <p style={{ color: "#94A3B8", fontWeight: 500 }}>Upload a question to get started</p>
              <p style={{ color: "#CBD5E1", fontSize: "0.82rem", marginTop: "8px" }}>Supports math, science, essays and more</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}