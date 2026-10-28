"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { CourseSkeleton, GeneratingSkeleton } from "../ui/Skeleton"
import { AlertTriangle, ArrowLeft, Brain, Check, FileText, Layers, Lightbulb, Sparkles, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { schedule, describeInterval, type Grade } from "../../lib/sm2"
import { calculateProgress, MASTERED_INTERVAL_DAYS, type QuizAttempt } from "../../lib/progress"
import { getCurrentUser } from "../../lib/auth"
import { structureContent } from "../../lib/formatContent"

const RichText = dynamic(() => import("../ui/RichText"), { loading: () => <GeneratingSkeleton text="Formatting..." rows={3} /> })


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
  id: string
  front: string
  back: string
  ease: number
  interval_days: number
  repetitions: number
  due_at: string
}

export default function CourseViewer({ courseId, onBack }: Props) {
  const [course, setCourse] = useState<Course | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("content")

  const [summary, setSummary] = useState("")
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")

  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState("")
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [flashcardsError, setFlashcardsError] = useState("")
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({})
  const [flashcardView, setFlashcardView] = useState<"review" | "all">("review")
  const [showAnswer, setShowAnswer] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  const [explainText, setExplainText] = useState("")
  const [explanation, setExplanation] = useState("")
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState("")

  async function fetchCourse() {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single()
    if (data) setCourse(data)
  }

  async function fetchAttempts() {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("score, total, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(10)
    setAttempts((data ?? []) as QuizAttempt[])
  }

  // Quiz results count towards progress. The score is also shown to the student
  // right away, so a failed save never blocks the quiz.
  async function submitQuiz() {
    setQuizSubmitted(true)
    const score = quiz.filter((q, i) => quizAnswers[i] === q.answer).length
    const user = await getCurrentUser()
    if (!user) return
    const attempt = { course_id: courseId, user_id: user.id, score, total: quiz.length }
    const { error } = await supabase.from("quiz_attempts").insert([attempt])
    if (!error) {
      setAttempts(prev => [{ score, total: quiz.length, created_at: new Date().toISOString() }, ...prev])
    }
  }

  async function fetchFlashcards() {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, front, back, ease, interval_days, repetitions, due_at")
      .eq("course_id", courseId)
      .order("due_at", { ascending: true })
    if (error) {
      setFlashcardsError("Could not load your saved flashcards.")
      return
    }
    setFlashcards((data ?? []) as Flashcard[])
    setNowTs(new Date().getTime())
  }

  async function gradeCard(card: Flashcard, grade: Grade) {
    const next = schedule(card, grade)
    const update = {
      ease: next.ease,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      due_at: next.due_at.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    }
    setShowAnswer(false)
    setNowTs(new Date().getTime())
    setFlashcards(prev => prev.map(c => (c.id === card.id ? { ...c, ...update } : c)))
    const { error } = await supabase.from("flashcards").update(update).eq("id", card.id)
    if (error) setFlashcardsError("Could not save your review. Check your connection.")
  }

  useEffect(() => {
    setCourse(null)
    setSummary("")
    setSummaryError("")
    setQuiz([])
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizError("")
    setFlashcards([])
    setFlippedCards({})
    setFlashcardsError("")
    setExplanation("")
    setExplainText("")
    setExplainError("")
    setActiveTab("content")
    setShowAnswer(false)
    fetchCourse()
    setAttempts([])
    fetchFlashcards()
    fetchAttempts()
  }, [courseId])

  async function callAI(prompt: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API error ${res.status}: ${errText}`)
      }

      const data = await res.json()

      const text =
        data.response ||
        data.result ||
        data.text ||
        data.message ||
        data.content ||
        data.output ||
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.text ||
        ""

      if (!text) {
        throw new Error("AI returned an empty response. Check your /api/ai route.")
      }

      return text
    } catch (err) {
      console.error("callAI failed:", err)
      throw err
    }
  }

  async function generateSummary() {
    if (!course?.content) return
    setSummaryLoading(true)
    setSummaryError("")
    try {
      const result = await callAI(
        `Summarize the following course content in a clear, structured way with key points and main takeaways. Use bullet points where appropriate.\n\nCourse: ${course.title}\n\nContent:\n${course.content.slice(0, 5000)}`
      )
      setSummary(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setSummaryError(`Failed to generate summary: ${message}`)
    } finally {
      setSummaryLoading(false)
    }
  }

  async function generateQuiz() {
    if (!course?.content) return
    setQuizLoading(true)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizError("")
    try {
      const result = await callAI(
        `Generate 10 multiple choice quiz questions based on this course content.
      Return ONLY a valid JSON array with no extra text, no markdown, no backticks. Format:
      [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ..."}]
      
      Course: ${course.title}
      Content: ${course.content.slice(0, 4000)}`
      )
      try {
        const cleaned = result.replace(/```json|```/g, "").trim()
        const match = cleaned.match(/\[[\s\S]*\]/)
        const parsed = JSON.parse(match ? match[0] : cleaned)
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid quiz format")
        setQuiz(parsed)
      } catch {
        setQuizError("AI returned an unexpected format. Try generating again.")
        setQuiz([])
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setQuizError(`Failed to generate quiz: ${message}`)
    } finally {
      setQuizLoading(false)
    }
  }

  async function generateFlashcards() {
    if (!course?.content) return
    setFlashcardsLoading(true)
    setFlippedCards({})
    setFlashcardsError("")
    try {
      const result = await callAI(
        `Generate 10 flashcards from this course content.
      Return ONLY a valid JSON array with no extra text, no markdown, no backticks. Format:
      [{"front":"term or question","back":"definition or answer"}]
      
      Course: ${course.title}
      Content: ${course.content.slice(0, 4000)}`
      )
      try {
        const cleaned = result.replace(/```json|```/g, "").trim()
        const match = cleaned.match(/\[[\s\S]*\]/)
        const parsed = JSON.parse(match ? match[0] : cleaned)
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid flashcard format")
        const cards = parsed.filter(
          (c: { front?: unknown; back?: unknown }) =>
            typeof c?.front === "string" && typeof c?.back === "string"
        )
        if (cards.length === 0) throw new Error("Invalid flashcard format")
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) throw new Error("You must be logged in to save flashcards.")
        const { error } = await supabase.from("flashcards").insert(
          cards.map((c: { front: string; back: string }) => ({
            user_id: userId,
            course_id: courseId,
            front: c.front,
            back: c.back,
          }))
        )
        if (error) throw new Error(error.message)
        await fetchFlashcards()
        setFlashcardView("review")
      } catch (e) {
        const msg = e instanceof Error ? e.message : ""
        setFlashcardsError(
          msg.startsWith("Invalid")
            ? "AI returned an unexpected format. Try generating again."
            : `Could not save flashcards: ${msg}`
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setFlashcardsError(`Failed to generate flashcards: ${message}`)
    } finally {
      setFlashcardsLoading(false)
    }
  }

  async function generateExplanation() {
    if (!explainText.trim()) return
    setExplainLoading(true)
    setExplainError("")
    try {
      const result = await callAI(
        `Explain the following concept or text in simple, easy-to-understand terms. Use examples where helpful.
      
      Context course: ${course?.title}
      
      Text to explain: ${explainText}`
      )
      setExplanation(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setExplainError(`Failed to generate explanation: ${message}`)
    } finally {
      setExplainLoading(false)
    }
  }

  const tabs: { id: Tab; label: string; Icon: typeof FileText }[] = [
    { id: "content", label: "Content", Icon: FileText },
    { id: "summary", label: "Summarize", Icon: Sparkles },
    { id: "quiz", label: "Quiz", Icon: Brain },
    { id: "flashcards", label: "Flashcards", Icon: Layers },
    { id: "explain", label: "Explain", Icon: Lightbulb },
  ]

  // Recalculated on every render, so it moves as soon as a card is graded or a quiz is submitted.
  const breakdown = calculateProgress(flashcards, attempts)
  const progress = breakdown.progress

  const status = progress === 100
    ? { className: "bg-accent text-on-accent", subClassName: "text-on-accent/80", label: "Complete", sub: "You have finished this course." }
    : progress >= 50
    ? { className: "bg-accent-tint text-accent-strong", subClassName: "text-accent-strong/80", label: "Halfway there", sub: `${100 - progress}% remaining` }
    : { className: "border border-line bg-surface text-ink", subClassName: "text-ink-muted", label: "Just started", sub: `${100 - progress}% remaining` }

  const panel = "rounded-xl border border-line bg-surface"
  const primaryButton =
    "shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
  const shell = "w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11"

  if (!course) {
    return <CourseSkeleton />
  }

  return (
    <section className={shell}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{course.title}</h1>
          <span className="mt-1.5 inline-block rounded-md bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-strong">
            {course.code}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left: tabs and content */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Tab bar */}
          <div role="tablist" aria-label="Study tools" className={`${panel} flex gap-1 overflow-x-auto p-1.5`}>
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-accent-tint text-accent-strong" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className={`${panel} min-h-[420px] p-6`}>

            {/* CONTENT TAB */}
            {activeTab === "content" && (
              course.content ? (
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                  <ContentBody content={course.content} />
                </div>
              ) : (
                <EmptyState
                  title="No document uploaded"
                  hint="Delete and re-add this course with a PDF or Word file."
                />
              )
            )}

            {/* SUMMARY TAB */}
            {activeTab === "summary" && (
              <div>
                <TabHeader title="AI summary" subtitle="Key points from your course content">
                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading || !course.content}
                    className={primaryButton}
                  >
                    {summaryLoading ? "Generating..." : summary ? "Regenerate" : "Generate summary"}
                  </button>
                </TabHeader>

                {summaryLoading && <GeneratingSkeleton text="AI is reading your course..." rows={5} />}

                {summaryError && !summaryLoading && <ErrorBanner message={summaryError} />}

                {summary && !summaryLoading && !summaryError && (
                  <RichText>{summary}</RichText>
                )}

                {!summary && !summaryLoading && !summaryError && (
                  <EmptyState title="No summary yet" hint="Choose Generate summary to get started." />
                )}
              </div>
            )}

            {/* QUIZ TAB */}
            {activeTab === "quiz" && (
              <div>
                <TabHeader title="Quiz" subtitle="Test your knowledge">
                  <button
                    onClick={generateQuiz}
                    disabled={quizLoading || !course.content}
                    className={primaryButton}
                  >
                    {quizLoading ? "Generating..." : quiz.length ? "New quiz" : "Generate quiz"}
                  </button>
                </TabHeader>

                {quizLoading && <GeneratingSkeleton text="Generating quiz questions..." rows={6} />}

                {quizError && !quizLoading && <ErrorBanner message={quizError} />}

                {quiz.length > 0 && !quizLoading && (
                  <div className="flex flex-col gap-5">
                    {quiz.map((q, i) => (
                      <div key={i} className="rounded-lg border border-line p-5">
                        <p className="mb-3.5 font-medium text-ink">
                          <span className="text-accent-strong">Q{i + 1}.</span> {q.question}
                        </p>
                        <div className="flex flex-col gap-2">
                          {q.options.map((option, j) => {
                            const isSelected = quizAnswers[i] === option
                            const isCorrect = option === q.answer
                            let stateClass = "border-line bg-surface text-ink hover:border-accent"

                            if (quizSubmitted) {
                              if (isCorrect) stateClass = "border-accent bg-accent-tint font-medium text-accent-strong"
                              else if (isSelected) stateClass = "border-danger bg-danger-tint font-medium text-danger"
                              else stateClass = "border-line bg-surface text-ink-muted"
                            } else if (isSelected) {
                              stateClass = "border-accent bg-accent-tint font-medium text-accent-strong"
                            }

                            return (
                              <button
                                key={j}
                                onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [i]: option }))}
                                aria-pressed={isSelected}
                                disabled={quizSubmitted}
                                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${stateClass}`}
                              >
                                <span>{option}</span>
                                {quizSubmitted && isCorrect && <Check size={16} aria-label="Correct answer" className="shrink-0" />}
                                {quizSubmitted && isSelected && !isCorrect && <X size={16} aria-label="Your incorrect answer" className="shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {!quizSubmitted ? (
                      <button
                        onClick={submitQuiz}
                        disabled={Object.keys(quizAnswers).length < quiz.length}
                        className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Submit answers
                      </button>
                    ) : (
                      <div role="status" className="rounded-lg bg-accent-tint p-5 text-center">
                        <p className="text-3xl font-semibold tabular-nums text-accent-strong">
                          {quiz.filter((q, i) => quizAnswers[i] === q.answer).length} / {quiz.length}
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">Correct answers</p>
                      </div>
                    )}
                  </div>
                )}

                {quiz.length === 0 && !quizLoading && !quizError && (
                  <EmptyState title="No quiz yet" hint="Choose Generate quiz to test yourself." />
                )}
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {activeTab === "flashcards" && (() => {
              const now = nowTs
              const dueCards = flashcards
                .filter(c => new Date(c.due_at).getTime() <= now)
                .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
              const current = dueCards[0]
              const gradeButtons: { grade: Grade; label: string; className: string }[] = [
                { grade: 0, label: "Again", className: "border-danger text-danger hover:bg-danger-tint" },
                { grade: 1, label: "Hard", className: "border-line text-ink hover:bg-paper" },
                { grade: 2, label: "Good", className: "border-accent text-accent-strong hover:bg-accent-tint" },
                { grade: 3, label: "Easy", className: "border-accent bg-accent text-on-accent hover:bg-accent-strong" },
              ]
              return (
              <div>
                <TabHeader
                  title="Flashcards"
                  subtitle={
                    flashcards.length === 0
                      ? "Generate a set to start studying"
                      : `${dueCards.length} due now · ${flashcards.length} total`
                  }
                >
                  <button
                    onClick={generateFlashcards}
                    disabled={flashcardsLoading || !course.content}
                    className={primaryButton}
                  >
                    {flashcardsLoading ? "Generating..." : flashcards.length ? "Add more cards" : "Generate flashcards"}
                  </button>
                </TabHeader>

                {flashcards.length > 0 && (
                  <div className="mb-5 flex gap-2" role="group" aria-label="Flashcard view">
                    {(["review", "all"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => { setFlashcardView(v); setShowAnswer(false) }}
                        aria-pressed={flashcardView === v}
                        className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                          flashcardView === v
                            ? "border-accent bg-accent-tint text-accent-strong"
                            : "border-line text-ink-muted hover:text-ink"
                        }`}
                      >
                        {v === "review" ? `Review (${dueCards.length})` : "All cards"}
                      </button>
                    ))}
                  </div>
                )}

                {flashcardsLoading && <GeneratingSkeleton text="Creating flashcards..." rows={4} />}

                {flashcardsError && !flashcardsLoading && <ErrorBanner message={flashcardsError} />}

                {/* Review mode */}
                {flashcards.length > 0 && !flashcardsLoading && flashcardView === "review" && (
                  current ? (
                    <div className="mx-auto max-w-[560px]">
                      <div
                        className={`flex min-h-[220px] items-center justify-center rounded-xl p-7 text-center ${
                          showAnswer ? "bg-accent text-on-accent" : "border border-line bg-accent-tint text-ink"
                        }`}
                      >
                        <div>
                          <p className={`mb-2.5 text-xs font-medium uppercase tracking-wide ${showAnswer ? "text-on-accent/80" : "text-accent-strong"}`}>
                            {showAnswer ? "Answer" : "Term"}
                          </p>
                          <p className="font-medium">{showAnswer ? current.back : current.front}</p>
                        </div>
                      </div>

                      {!showAnswer ? (
                        <button
                          onClick={() => setShowAnswer(true)}
                          className="mt-4 w-full rounded-lg bg-ink py-3 text-sm font-medium text-surface transition-opacity hover:opacity-90"
                        >
                          Show answer
                        </button>
                      ) : (
                        <div className="mt-4 grid grid-cols-4 gap-2.5">
                          {gradeButtons.map(g => (
                            <button
                              key={g.grade}
                              onClick={() => gradeCard(current, g.grade)}
                              className={`rounded-lg border px-1 py-2.5 text-sm font-medium transition-colors ${g.className}`}
                            >
                              {g.label}
                              <span className="mt-0.5 block text-xs font-normal opacity-80">
                                {describeInterval(schedule(current, g.grade))}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      title="You are done for now"
                      hint="No cards are due. Come back later, or add more cards."
                    />
                  )
                )}

                {/* All cards */}
                {flashcards.length > 0 && !flashcardsLoading && flashcardView === "all" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {flashcards.map((card, i) => (
                      <button
                        key={card.id}
                        type="button"
                        className="flashcard h-40 w-full text-left"
                        aria-pressed={!!flippedCards[i]}
                        aria-label={flippedCards[i] ? `Answer: ${card.back}. Select to show the term.` : `Term: ${card.front}. Select to show the answer.`}
                        onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                      >
                        <div className={`flashcard-inner ${flippedCards[i] ? "flipped" : ""}`}>
                          <div className="flashcard-face border border-line bg-accent-tint text-ink">
                            <div>
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent-strong">Term</p>
                              <p className="text-sm font-medium">{card.front}</p>
                            </div>
                          </div>
                          <div className="flashcard-face flashcard-face-back bg-accent text-on-accent">
                            <div>
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-accent/80">Answer</p>
                              <p className="text-sm">{card.back}</p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {flashcards.length === 0 && !flashcardsLoading && !flashcardsError && (
                  <EmptyState title="No flashcards yet" hint="Choose Generate flashcards to start studying." />
                )}
              </div>
              )
            })()}

            {/* EXPLAIN TAB */}
            {activeTab === "explain" && (
              <div>
                <TabHeader title="Explain" subtitle="Paste any text or concept and AI will explain it simply" />

                <label htmlFor="explain-text" className="sr-only">Text to explain</label>
                <textarea
                  id="explain-text"
                  value={explainText}
                  onChange={(e) => setExplainText(e.target.value)}
                  placeholder="Paste a paragraph, term, or concept from your course..."
                  rows={5}
                  className="mb-3 w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />

                <button
                  onClick={generateExplanation}
                  disabled={explainLoading || !explainText.trim()}
                  className={`${primaryButton} mb-6`}
                >
                  {explainLoading ? "Explaining..." : "Explain this"}
                </button>

                {explainLoading && <GeneratingSkeleton text="AI is thinking..." rows={4} />}

                {explainError && !explainLoading && <ErrorBanner message={explainError} />}

                {explanation && !explainLoading && !explainError && (
                  <div className="rounded-lg border border-line bg-accent-tint p-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-accent-strong">AI explanation</p>
                    <RichText>{explanation}</RichText>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: progress panel */}
        <div className="flex flex-col gap-4">
          <div className={`${panel} p-6`}>
            <h2 className="text-lg font-semibold text-ink">Study progress</h2>
            <p className="mb-5 mt-0.5 text-sm text-ink-muted">Updates automatically from your flashcards and quizzes</p>

            <p className="mb-4 text-center text-5xl font-semibold tabular-nums text-ink">{progress}%</p>

            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Course progress"
              className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-line"
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <div className="flex items-baseline justify-between">
                  <dt className="font-medium text-ink">Flashcards</dt>
                  <dd className="tabular-nums text-ink-muted">{breakdown.flashcards.percent}%</dd>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${breakdown.flashcards.percent}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">
                  {breakdown.flashcards.cards === 0
                    ? "Create flashcards and review them over several days."
                    : `${breakdown.flashcards.mastered} of ${breakdown.flashcards.cards} cards remembered for ${MASTERED_INTERVAL_DAYS}+ days`}
                </p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <dt className="font-medium text-ink">Quizzes</dt>
                  <dd className="tabular-nums text-ink-muted">{breakdown.quizzes.percent}%</dd>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${breakdown.quizzes.percent}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">
                  {breakdown.quizzes.attempts === 0
                    ? "Take quizzes to build this up. Three or more count fully."
                    : `Average ${breakdown.quizzes.average}% over your last ${breakdown.quizzes.attempts} ${breakdown.quizzes.attempts === 1 ? "quiz" : "quizzes"}`}
                </p>
              </div>
            </dl>
          </div>

          {/* Status */}
          <div className={`rounded-xl p-6 ${status.className}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${status.subClassName}`}>Status</p>
            <h3 className="mt-2 text-xl font-semibold">{status.label}</h3>
            <p className={`mt-1 text-sm ${status.subClassName}`}>{status.sub}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-danger-tint px-3.5 py-3 text-sm leading-relaxed text-danger">
      <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {message}
    </div>
  )
}

function TabHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-14 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>
    </div>
  )
}

// The uploaded document as headings, lists and paragraphs. Built once per
// document, since structuring a long course takes a moment.
function ContentBody({ content }: { content: string }) {
  const markdown = useMemo(() => structureContent(content), [content])
  return <RichText>{markdown}</RichText>
}
