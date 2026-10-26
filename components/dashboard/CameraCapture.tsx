"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, RefreshCw, X } from "lucide-react"

type Props = {
  onCapture: (file: File) => void
  onClose: () => void
}

// Longest side of the saved photo. Keeps uploads small enough for the server
// while staying sharp enough to read printed text.
const MAX_SIDE = 1600

function describeError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ""
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow the camera for this site in your browser settings, then try again."
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device."
  }
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close it and try again."
  }
  return "Could not start the camera."
}

/**
 * Live camera view. The user frames the question, taps Capture, and the frame
 * is handed back as a JPEG File, the same shape as an uploaded photo.
 */
export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [canFlip, setCanFlip] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser can't open the camera here. Use Upload instead.")
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        stopStream()
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1)
      } catch (err) {
        if (!cancelled) setError(describeError(err))
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [facing, stopStream])

  // Escape closes the camera
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the photo. Please try again.")
          return
        }
        const file = new File([blob], `question-${Date.now()}.jpg`, { type: "image/jpeg" })
        stopStream()
        onCapture(file)
      },
      "image/jpeg",
      0.9
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-paper">
      {error ? (
        <div role="alert" className="px-5 py-10 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="relative aspect-[4/3] w-full bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Live camera view"
              onLoadedData={() => setReady(true)}
              className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
            {!ready && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sm text-on-accent"
              >
                Starting camera...
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <X size={16} aria-hidden="true" /> Cancel
            </button>
            <button
              onClick={capture}
              disabled={!ready}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera size={16} aria-hidden="true" /> Capture
            </button>
            {canFlip ? (
              <button
                onClick={() => { setReady(false); setFacing(facing === "environment" ? "user" : "environment") }}
                aria-label="Switch camera"
                className="rounded-lg border border-line bg-surface p-2.5 text-ink transition-colors hover:bg-paper"
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            ) : (
              <span className="w-[38px]" aria-hidden="true" />
            )}
          </div>
        </>
      )}
    </div>
  )
}
