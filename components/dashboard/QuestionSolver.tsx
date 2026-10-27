"use client"

import { useState } from "react"
import { AlertTriangle, Camera, FileText, Image as ImageIcon, Upload } from "lucide-react"
import dynamic from "next/dynamic"
import CameraCapture from "./CameraCapture"
import SolverHistory from "./SolverHistory"
import { makeThumbnail, saveSolvedQuestion, titleFromSolution } from "../../lib/solvedHistory"
import { SolutionSkeleton } from "../ui/Skeleton"

// Maths rendering is large, so it only loads once there is an answer to show.
const RichText = dynamic(() => import("../ui/RichText"), { loading: () => <SolutionSkeleton /> })

export default function QuestionSolver() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [solution, setSolution] = useState("")
  const [extractedText, setExtractedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showExtracted, setShowExtracted] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [tab, setTab] = useState<"new" | "history">("new")
  const [historyKey, setHistoryKey] = useState(0)
  const [savedToHistory, setSavedToHistory] = useState(false)

  function handleFileChange(f: File) {
    setFile(f)
    setSolution("")
    setExtractedText("")
    setError("")
    setSavedToHistory(false)

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
        void saveToHistory(data.solution, data.extractedText)
      }
    } catch {
      setError("Failed to connect to server.")
    }

    setLoading(false)
  }

  // Keep every solved question for later. Saving never blocks or breaks solving.
  async function saveToHistory(answer: string, questionText?: string) {
    if (!file) return
    const type = file.type.startsWith("image/") ? "image" : file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf"
    const saved = await saveSolvedQuestion({
      title: titleFromSolution(answer, file.name),
      source_name: type === "image" ? null : file.name,
      source_type: type,
      question_text: questionText ? questionText.slice(0, 60000) : null,
      thumbnail: type === "image" && preview ? await makeThumbnail(preview) : null,
      solution: answer.slice(0, 60000),
    })
    if (saved) {
      setSavedToHistory(true)
      setHistoryKey((k) => k + 1)
    }
  }

  const panel = "rounded-xl border border-line bg-surface p-6"
  const canSolve = !!file && !loading

  return (
    <section className="w-full flex-1 overflow-y-auto px-5 pb-8 pt-[88px] md:px-12 md:py-11">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Question solver</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Upload a PDF, Word document, or a photo, or point your camera at a question, and get a full solution.
        </p>
      </div>

      <div role="tablist" aria-label="Solver" className="mt-6 inline-flex gap-1 rounded-lg border border-line bg-surface p-1">
        {([["new", "New question"], ["history", "History"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === id ? "bg-accent-tint text-accent-strong" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "history" && <SolverHistory refreshKey={historyKey} />}

      <div className={`mt-8 grid gap-6 lg:grid-cols-2 ${tab === "history" ? "hidden" : ""}`}>
        {/* Upload panel */}
        <div className="flex flex-col gap-6">
          <div className={panel}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Add question</h2>
              {!cameraOpen && (
                <button
                  onClick={() => setCameraOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
                >
                  <Camera size={16} aria-hidden="true" /> Use camera
                </button>
              )}
            </div>

            {cameraOpen && (
              <CameraCapture
                onClose={() => setCameraOpen(false)}
                onCapture={(f) => { handleFileChange(f); setCameraOpen(false) }}
              />
            )}

            {/* Drop zone */}
            {!cameraOpen && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a file to upload"
              onClick={() => document.getElementById("question-upload")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  document.getElementById("question-upload")?.click()
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileChange(f)
              }}
              className={`cursor-pointer rounded-lg border border-dashed px-5 py-10 text-center transition-colors hover:border-accent hover:bg-accent-tint ${
                file ? "border-accent bg-accent-tint" : "border-line"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  {file.type.startsWith("image/")
                    ? <ImageIcon size={28} aria-hidden="true" className="text-accent-strong" />
                    : <FileText size={28} aria-hidden="true" className="text-accent-strong" />}
                  <p className="mt-2 break-all text-sm font-medium text-accent-strong">{file.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload size={28} aria-hidden="true" className="text-ink-muted" />
                  <p className="mt-2 text-sm font-medium text-ink">Drop your file here</p>
                  <p className="mt-0.5 text-xs text-ink-muted">PDF, Word (.docx), or image (JPG, PNG)</p>
                </div>
              )}
              <input
                id="question-upload"
                type="file"
                accept=".pdf,.docx,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }}
              />
            </div>
            )}

            {/* Image preview */}
            {preview && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Question preview"
                  className="max-h-[300px] w-full rounded-lg border border-line object-contain"
                />
              </div>
            )}

            {/* Solve button */}
            <button
              onClick={solve}
              disabled={!canSolve}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-accent border-t-transparent" />
                  Solving...
                </>
              ) : "Solve question"}
            </button>
          </div>

          {/* Tips */}
          <div className={panel}>
            <h2 className="mb-3 text-sm font-semibold text-ink">Tips for best results</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              {[
                "Hold the camera steady and make sure the question is well lit.",
                "Crop the image to show just the question.",
                "For PDF or Word files, include all parts of the question.",
                "Works with math, science, essays and more.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Solution panel */}
        <div className={`${panel} min-h-[420px]`}>
          <h2 className="mb-4 text-lg font-semibold text-ink">Solution</h2>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-danger-tint px-3.5 py-3 text-sm text-danger">
              <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {loading && (
            <SolutionSkeleton />
          )}

          {solution && !loading && (
            <div>
              {/* Extracted text toggle for PDF/Word */}
              {extractedText && (
                <div className="mb-5">
                  <button
                    onClick={() => setShowExtracted(!showExtracted)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper"
                  >
                    {showExtracted ? "Hide" : "Show"} extracted text
                  </button>

                  {showExtracted && (
                    <div className="mt-2.5 max-h-[150px] overflow-y-auto rounded-lg bg-paper p-4">
                      <p className="text-sm leading-relaxed text-ink-muted">{extractedText}</p>
                    </div>
                  )}
                </div>
              )}

              {savedToHistory && (
                <p className="mb-3 text-xs text-ink-muted">
                  Saved to your <button onClick={() => setTab("history")} className="font-medium text-accent-strong underline">history</button>
                </p>
              )}
              <RichText>{solution}</RichText>
            </div>
          )}

          {!solution && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-medium text-ink">Upload or capture a question to get started</p>
              <p className="mt-1.5 text-sm text-ink-muted">Supports math, science, essays and more.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
