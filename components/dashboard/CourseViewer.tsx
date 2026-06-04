"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Course = {
  id: string
  title: string
  code: string
  progress: number
  content: string
}

type Props = {
  courseId: string
  onBack: () => void
}

export default function CourseViewer({ courseId, onBack }: Props) {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function fetchCourse() {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single()
    if (data) {
      setCourse(data)
      setProgress(data.progress)
    }
  }

  useEffect(() => { fetchCourse() }, [courseId])

  async function saveProgress(value: number) {
    setSaving(true)
    setSaved(false)
    await supabase.from("courses").update({ progress: value }).eq("id", courseId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!course) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#080810" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          border: "3px solid #8B5CF6", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
    )
  }

  const statusConfig = progress === 100
    ? { bg: "linear-gradient(135deg, #10B981, #059669)", emoji: "🎉", label: "Complete!", sub: "You've mastered this course!" }
    : progress >= 50
    ? { bg: "linear-gradient(135deg, #8B5CF6, #3B82F6)", emoji: "📖", label: "Halfway there", sub: `${100 - progress}% remaining` }
    : { bg: "linear-gradient(135deg, #1E293B, #0F172A)", emoji: "🚀", label: "Just started", sub: `${100 - progress}% remaining` }

  return (
    <main style={{
      flex: 1,
      background: "#080810",
      padding: "40px",
      overflowY: "auto",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .content-scroll::-webkit-scrollbar { width: 4px; }
        .content-scroll::-webkit-scrollbar-track { background: transparent; }
        .content-scroll::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 99px; }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px; background: #1E293B; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #8B5CF6, #3B82F6); cursor: pointer; box-shadow: 0 0 10px rgba(139,92,246,0.5); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "10px 18px",
            color: "#94A3B8",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "2rem", fontWeight: 900,
            color: "#FFFFFF", lineHeight: 1.1,
          }}>{course.title}</h1>
          <span style={{
            display: "inline-block", marginTop: "6px",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.25)",
            color: "#A78BFA", borderRadius: "8px",
            padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600,
          }}>{course.code}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>

        {/* Content Panel */}
        <div style={{
          background: "#0D0D1A",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "28px",
          padding: "32px",
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.25rem", fontWeight: 700,
            color: "#FFFFFF", marginBottom: "24px",
          }}>Course Content</h2>

          {course.content ? (
            <div className="content-scroll" style={{
              maxHeight: "65vh", overflowY: "auto",
              paddingRight: "12px",
            }}>
              {course.content.split("\n\n").map((paragraph, i) => (
                <p key={i} style={{
                  color: "#94A3B8",
                  fontSize: "0.9rem",
                  lineHeight: 1.8,
                  marginBottom: "16px",
                }}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📄</p>
              <p style={{ color: "#475569", fontWeight: 500 }}>No document uploaded</p>
              <p style={{ color: "#334155", fontSize: "0.8rem", marginTop: "8px" }}>Delete and re-add this course with a PDF or Word file</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Progress */}
          <div style={{
            background: "#0D0D1A",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "28px",
            padding: "28px",
          }}>
            <h2 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>Study Progress</h2>
            <p style={{ color: "#475569", fontSize: "0.8rem", marginBottom: "24px" }}>Drag to update your progress</p>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "4rem", fontWeight: 900,
                background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>{progress}%</span>
            </div>

            <div style={{
              width: "100%", height: "6px",
              background: "#1E293B", borderRadius: "99px",
              overflow: "hidden", marginBottom: "16px",
            }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #8B5CF6, #3B82F6)",
                borderRadius: "99px",
                transition: "width 0.3s ease",
              }} />
            </div>

            <input
              type="range"
              min={0} max={100} step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: "100%", marginBottom: "8px" }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", color: "#334155", fontSize: "0.7rem", marginBottom: "20px" }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>

            <button
              onClick={() => saveProgress(progress)}
              disabled={saving}
              style={{
                width: "100%",
                background: saved
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                border: "none",
                borderRadius: "14px",
                padding: "14px",
                color: "white",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 0.3s",
              }}
            >
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Progress"}
            </button>
          </div>

          {/* Status Card */}
          <div style={{
            background: statusConfig.bg,
            borderRadius: "28px",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "-30px", right: "-30px",
              width: "100px", height: "100px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "50%",
            }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</p>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: "white", fontSize: "1.4rem",
              fontWeight: 800, marginTop: "8px",
            }}>{statusConfig.emoji} {statusConfig.label}</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: "6px" }}>{statusConfig.sub}</p>
          </div>
        </div>
      </div>
    </main>
  )
}