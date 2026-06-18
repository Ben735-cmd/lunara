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

type Tab = "content" | "summary" | "quiz" | "flashcards" | "explain"

type QuizQuestion = {
  question: string
  options: string[]
  answer: string
}

type Flashcard = {
  front: string
  back: string
}

export default function CourseViewer({ courseId, onBack }: Props) {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("content")

  // AI states
  const [summary, setSummary] = useState("")
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({})

  const [explainText, setExplainText] = useState("")
  const [explanation, setExplanation] = useState("")
  const [explainLoading, setExplainLoading] = useState(false)

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

  async function callAI(prompt: string): Promise<string> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    return data.response || ""
  }

  async function generateSummary() {
    if (!course?.content) return
    setSummaryLoading(true)
    const result = await callAI(
      `Summarize the following course content in a clear, structured way with key points and main takeaways. Use bullet points where appropriate.\n\nCourse: ${course.title}\n\nContent:\n${course.content.slice(0, 4000)}`
    )
    setSummary(result)
    setSummaryLoading(false)
  }

  async function generateQuiz() {
    if (!course?.content) return
    setQuizLoading(true)
    setQuizAnswers({})
    setQuizSubmitted(false)
    const result = await callAI(
      `Generate 5 multiple choice quiz questions based on this course content. 
      Return ONLY a valid JSON array with no extra text, no markdown, no backticks. Format:
      [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ..."}]
      
      Course: ${course.title}
      Content: ${course.content.slice(0, 4000)}`
    )
    try {
      const cleaned = result.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned)
      setQuiz(parsed)
    } catch {
      setQuiz([])
    }
    setQuizLoading(false)
  }

  async function generateFlashcards() {
    if (!course?.content) return
    setFlashcardsLoading(true)
    setFlippedCards({})
    const result = await callAI(
      `Generate 8 flashcards from this course content.
      Return ONLY a valid JSON array with no extra text, no markdown, no backticks. Format:
      [{"front":"term or question","back":"definition or answer"}]
      
      Course: ${course.title}
      Content: ${course.content.slice(0, 4000)}`
    )
    try {
      const cleaned = result.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned)
      setFlashcards(parsed)
    } catch {
      setFlashcards([])
    }
    setFlashcardsLoading(false)
  }

  async function generateExplanation() {
    if (!explainText.trim()) return
    setExplainLoading(true)
    const result = await callAI(
      `Explain the following concept or text in simple, easy-to-understand terms. Use examples where helpful.
      
      Context course: ${course?.title}
      
      Text to explain: ${explainText}`
    )
    setExplanation(result)
    setExplainLoading(false)
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "content", label: "Content", icon: "📄" },
    { id: "summary", label: "Summarize", icon: "✨" },
    { id: "quiz", label: "Quiz", icon: "🧠" },
    { id: "flashcards", label: "Flashcards", icon: "🃏" },
    { id: "explain", label: "Explain", icon: "💡" },
  ]

  const statusConfig = progress === 100
    ? { bg: "linear-gradient(135deg, #10B981, #059669)", emoji: "🎉", label: "Complete!", sub: "You've mastered this course!" }
    : progress >= 50
    ? { bg: "linear-gradient(135deg, #8B5CF6, #3B82F6)", emoji: "📖", label: "Halfway there", sub: `${100 - progress}% remaining` }
    : { bg: "linear-gradient(135deg, #1E293B, #0F172A)", emoji: "🚀", label: "Just started", sub: `${100 - progress}% remaining` }

  if (!course) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2FF" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      </div>
    )
  }

  return (
    <main style={{ flex: 1, background: "#F0F2FF", padding: "40px", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=Space+Grotesk:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .content-scroll::-webkit-scrollbar { width: 4px; }
        .content-scroll::-webkit-scrollbar-track { background: transparent; }
        .content-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px; background: #E2E8F0; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #8B5CF6, #3B82F6); cursor: pointer; box-shadow: 0 0 10px rgba(139,92,246,0.4); }
        .flashcard { perspective: 1000px; cursor: pointer; }
        .flashcard-inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s; transform-style: preserve-3d; }
        .flashcard-inner.flipped { transform: rotateY(180deg); }
        .flashcard-front, .flashcard-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 20px; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; }
        .flashcard-back { transform: rotateY(180deg); }
        .ai-content { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button
          onClick={onBack}
          style={{
            background: "white", border: "1.5px solid #E2E8F0",
            borderRadius: "12px", padding: "10px 18px",
            color: "#64748B", fontSize: "0.85rem", fontWeight: 500,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >← Back</button>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 900, color: "#0F172A", lineHeight: 1.1 }}>{course.title}</h1>
          <span style={{
            display: "inline-block", marginTop: "6px",
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
            color: "#7C3AED", borderRadius: "8px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600,
          }}>{course.code}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>

        {/* Left — Tabs + Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Tab Bar */}
          <div style={{
            background: "white", borderRadius: "20px", padding: "6px",
            display: "flex", gap: "4px",
            border: "1.5px solid #F1F5F9",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "10px 8px",
                  borderRadius: "14px", border: "none",
                  background: activeTab === tab.id
                    ? "linear-gradient(135deg, #8B5CF6, #3B82F6)"
                    : "transparent",
                  color: activeTab === tab.id ? "white" : "#94A3B8",
                  fontWeight: 600, fontSize: "0.8rem",
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "6px",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            background: "white", borderRadius: "28px", padding: "32px",
            border: "1.5px solid #F1F5F9",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            minHeight: "500px",
          }}>

            {/* CONTENT TAB */}
            {activeTab === "content" && (
              course.content ? (
                <div className="content-scroll" style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: "8px" }}>
                  {course.content.split("\n\n").map((paragraph, i) => (
                    <p key={i} style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: "16px" }}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 0" }}>
                  <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📄</p>
                  <p style={{ color: "#94A3B8", fontWeight: 500 }}>No document uploaded</p>
                  <p style={{ color: "#CBD5E1", fontSize: "0.8rem", marginTop: "8px" }}>Delete and re-add this course with a PDF or Word file</p>
                </div>
              )
            )}

            {/* SUMMARY TAB */}
            {activeTab === "summary" && (
              <div className="ai-content">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <div>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0F172A" }}>✨ AI Summary</h2>
                    <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginTop: "4px" }}>Key points from your course content</p>
                  </div>
                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading || !course.content}
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                      border: "none", borderRadius: "14px",
                      padding: "10px 20px", color: "white",
                      fontWeight: 700, fontSize: "0.85rem",
                      cursor: summaryLoading ? "not-allowed" : "pointer",
                      opacity: summaryLoading ? 0.7 : 1,
                      boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    }}
                  >{summaryLoading ? "Generating..." : summary ? "Regenerate" : "Generate Summary"}</button>
                </div>

                {summaryLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "40px 0", justifyContent: "center" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ color: "#94A3B8" }}>AI is reading your course...</p>
                  </div>
                )}

                {summary && !summaryLoading && (
                  <div style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {summary}
                  </div>
                )}

                {!summary && !summaryLoading && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>✨</p>
                    <p style={{ color: "#94A3B8", fontWeight: 500 }}>Click "Generate Summary" to get started</p>
                  </div>
                )}
              </div>
            )}

            {/* QUIZ TAB */}
            {activeTab === "quiz" && (
              <div className="ai-content">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <div>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0F172A" }}>🧠 Quiz</h2>
                    <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginTop: "4px" }}>Test your knowledge</p>
                  </div>
                  <button
                    onClick={generateQuiz}
                    disabled={quizLoading || !course.content}
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                      border: "none", borderRadius: "14px",
                      padding: "10px 20px", color: "white",
                      fontWeight: 700, fontSize: "0.85rem",
                      cursor: quizLoading ? "not-allowed" : "pointer",
                      opacity: quizLoading ? 0.7 : 1,
                      boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    }}
                  >{quizLoading ? "Generating..." : quiz.length ? "New Quiz" : "Generate Quiz"}</button>
                </div>

                {quizLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "40px 0", justifyContent: "center" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ color: "#94A3B8" }}>Generating quiz questions...</p>
                  </div>
                )}

                {quiz.length > 0 && !quizLoading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {quiz.map((q, i) => (
                      <div key={i} style={{ border: "1.5px solid #F1F5F9", borderRadius: "20px", padding: "20px" }}>
                        <p style={{ fontWeight: 700, color: "#0F172A", marginBottom: "14px", fontSize: "0.95rem" }}>
                          <span style={{ color: "#8B5CF6" }}>Q{i + 1}.</span> {q.question}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {q.options.map((option, j) => {
                            const isSelected = quizAnswers[i] === option
                            const isCorrect = option === q.answer
                            let bg = "rgba(139,92,246,0.05)"
                            let border = "1px solid #F1F5F9"
                            let color = "#334155"

                            if (quizSubmitted) {
                              if (isCorrect) { bg = "rgba(16,185,129,0.1)"; border = "1px solid rgba(16,185,129,0.3)"; color = "#059669" }
                              else if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.08)"; border = "1px solid rgba(239,68,68,0.2)"; color = "#EF4444" }
                            } else if (isSelected) {
                              bg = "rgba(139,92,246,0.1)"; border = "1px solid rgba(139,92,246,0.3)"; color = "#7C3AED"
                            }

                            return (
                              <button
                                key={j}
                                onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [i]: option }))}
                                style={{
                                  background: bg, border, borderRadius: "12px",
                                  padding: "12px 16px", textAlign: "left",
                                  color, fontSize: "0.875rem", fontWeight: isSelected ? 600 : 400,
                                  cursor: quizSubmitted ? "default" : "pointer",
                                  transition: "all 0.15s",
                                }}
                              >{option}</button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {!quizSubmitted ? (
                      <button
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(quizAnswers).length < quiz.length}
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                          border: "none", borderRadius: "14px", padding: "14px",
                          color: "white", fontWeight: 700, fontSize: "0.9rem",
                          cursor: Object.keys(quizAnswers).length < quiz.length ? "not-allowed" : "pointer",
                          opacity: Object.keys(quizAnswers).length < quiz.length ? 0.5 : 1,
                        }}
                      >Submit Answers</button>
                    ) : (
                      <div style={{
                        background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                        borderRadius: "20px", padding: "20px", textAlign: "center",
                      }}>
                        <p style={{ color: "white", fontSize: "1.5rem", fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {quiz.filter((q, i) => quizAnswers[i] === q.answer).length} / {quiz.length}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem", marginTop: "4px" }}>Correct answers</p>
                      </div>
                    )}
                  </div>
                )}

                {quiz.length === 0 && !quizLoading && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🧠</p>
                    <p style={{ color: "#94A3B8", fontWeight: 500 }}>Click "Generate Quiz" to test yourself</p>
                  </div>
                )}
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {activeTab === "flashcards" && (
              <div className="ai-content">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <div>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0F172A" }}>🃏 Flashcards</h2>
                    <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginTop: "4px" }}>Click a card to flip it</p>
                  </div>
                  <button
                    onClick={generateFlashcards}
                    disabled={flashcardsLoading || !course.content}
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                      border: "none", borderRadius: "14px",
                      padding: "10px 20px", color: "white",
                      fontWeight: 700, fontSize: "0.85rem",
                      cursor: flashcardsLoading ? "not-allowed" : "pointer",
                      opacity: flashcardsLoading ? 0.7 : 1,
                      boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    }}
                  >{flashcardsLoading ? "Generating..." : flashcards.length ? "New Set" : "Generate Flashcards"}</button>
                </div>

                {flashcardsLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "40px 0", justifyContent: "center" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ color: "#94A3B8" }}>Creating flashcards...</p>
                  </div>
                )}

                {flashcards.length > 0 && !flashcardsLoading && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                    {flashcards.map((card, i) => (
                      <div
                        key={i}
                        className="flashcard"
                        onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                        style={{ height: "160px" }}
                      >
                        <div className={`flashcard-inner ${flippedCards[i] ? "flipped" : ""}`}>
                          <div className="flashcard-front" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))", border: "1.5px solid rgba(139,92,246,0.2)" }}>
                            <div>
                              <p style={{ fontSize: "0.65rem", color: "#A78BFA", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>TERM</p>
                              <p style={{ color: "#0F172A", fontWeight: 600, fontSize: "0.9rem" }}>{card.front}</p>
                            </div>
                          </div>
                          <div className="flashcard-back" style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
                            <div>
                              <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>ANSWER</p>
                              <p style={{ color: "white", fontWeight: 500, fontSize: "0.85rem" }}>{card.back}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {flashcards.length === 0 && !flashcardsLoading && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🃏</p>
                    <p style={{ color: "#94A3B8", fontWeight: 500 }}>Click "Generate Flashcards" to study</p>
                  </div>
                )}
              </div>
            )}

            {/* EXPLAIN TAB */}
            {activeTab === "explain" && (
              <div className="ai-content">
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0F172A" }}>💡 Explain</h2>
                  <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginTop: "4px" }}>Paste any text or concept and AI will explain it simply</p>
                </div>

                <textarea
                  value={explainText}
                  onChange={(e) => setExplainText(e.target.value)}
                  placeholder="Paste a paragraph, term, or concept from your course..."
                  rows={5}
                  style={{
                    width: "100%", border: "1.5px solid #E2E8F0",
                    borderRadius: "16px", padding: "16px",
                    fontSize: "0.9rem", color: "#334155",
                    outline: "none", resize: "vertical",
                    fontFamily: "inherit", lineHeight: 1.7,
                    marginBottom: "12px",
                  }}
                />

                <button
                  onClick={generateExplanation}
                  disabled={explainLoading || !explainText.trim()}
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                    border: "none", borderRadius: "14px",
                    padding: "12px 24px", color: "white",
                    fontWeight: 700, fontSize: "0.875rem",
                    cursor: explainLoading || !explainText.trim() ? "not-allowed" : "pointer",
                    opacity: explainLoading || !explainText.trim() ? 0.6 : 1,
                    boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    marginBottom: "24px",
                  }}
                >{explainLoading ? "Explaining..." : "Explain This"}</button>

                {explainLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 0" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ color: "#94A3B8" }}>AI is thinking...</p>
                  </div>
                )}

                {explanation && !explainLoading && (
                  <div style={{
                    background: "rgba(139,92,246,0.05)",
                    border: "1.5px solid rgba(139,92,246,0.15)",
                    borderRadius: "20px", padding: "24px",
                  }}>
                    <p style={{ fontSize: "0.75rem", color: "#A78BFA", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>AI Explanation</p>
                    <p style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right — Progress Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "white", border: "1.5px solid #F1F5F9",
            borderRadius: "28px", padding: "28px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}>
            <h2 style={{ color: "#0F172A", fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>Study Progress</h2>
            <p style={{ color: "#94A3B8", fontSize: "0.8rem", marginBottom: "24px" }}>Drag to update your progress</p>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "4rem", fontWeight: 900,
                background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>{progress}%</span>
            </div>

            <div style={{ width: "100%", height: "6px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #8B5CF6, #3B82F6)", borderRadius: "99px", transition: "width 0.3s ease" }} />
            </div>

            <input
              type="range" min={0} max={100} step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: "100%", marginBottom: "8px" }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", color: "#CBD5E1", fontSize: "0.7rem", marginBottom: "20px" }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>

            <button
              onClick={() => saveProgress(progress)}
              disabled={saving}
              style={{
                width: "100%",
                background: saved ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                border: "none", borderRadius: "14px", padding: "14px",
                color: "white", fontWeight: 700, fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, transition: "all 0.3s",
              }}
            >{saving ? "Saving..." : saved ? "✓ Saved!" : "Save Progress"}</button>
          </div>

          {/* Status Card */}
          <div style={{ background: statusConfig.bg, borderRadius: "28px", padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "100px", height: "100px", background: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</p>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: "white", fontSize: "1.4rem", fontWeight: 800, marginTop: "8px" }}>{statusConfig.emoji} {statusConfig.label}</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", marginTop: "6px" }}>{statusConfig.sub}</p>
          </div>
        </div>
      </div>
    </main>
  )
}