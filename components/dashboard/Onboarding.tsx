"use client"

import { useRef, useState } from "react"
import { Camera } from "lucide-react"
import Logo from "../ui/Logo"
import { uploadAvatar } from "../../lib/avatar"

type Props = {
  userId: string
  email: string
  initialName: string
  initialAvatar: string
  /** Saves the details. Returns false when the save did not go through. */
  onSave: (values: { fullName: string; university: string; avatarUrl: string }) => Promise<boolean>
}

/** Shown once to a new student: name, university and an optional profile picture. */
export default function Onboarding({ userId, email, initialName, initialAvatar, onSave }: Props) {
  const [fullName, setFullName] = useState(initialName)
  const [university, setUniversity] = useState("")
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = fullName.trim()
    ? fullName.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? "?"

  async function pickPicture(file: File) {
    setUploading(true)
    setError("")
    try {
      setAvatarUrl(await uploadAvatar(userId, file))
    } catch {
      setError("Could not upload that picture. Try a different image, or skip it for now.")
    }
    setUploading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !university.trim()) {
      setError("Enter your name and your university to continue.")
      return
    }
    setSaving(true)
    setError("")
    const ok = await onSave({ fullName: fullName.trim(), university: university.trim(), avatarUrl })
    if (!ok) setError("Could not save. Check your connection and try again.")
    setSaving(false)
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-paper/90 px-5 py-8 backdrop-blur-sm"
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-lg">
        <Logo size={32} className="mb-5" />
        <h2 id="welcome-title" className="text-2xl font-semibold tracking-tight text-ink">Welcome to Lunara</h2>
        <p className="mt-1.5 text-sm text-ink-muted">Tell us a little about you. You can change this later in your profile.</p>

        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Choose a profile picture"
            className="relative rounded-full"
          >
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-accent text-2xl font-semibold text-on-accent">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-accent">
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-accent border-t-transparent" />
              ) : (
                <Camera size={16} aria-hidden="true" />
              )}
            </span>
          </button>
          <p className="mt-3 text-xs text-ink-muted">Profile picture (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (f) pickPicture(f)
            }}
          />
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="welcome-name" className="mb-1.5 block text-sm font-medium text-ink">Your name</label>
            <input
              id="welcome-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Ben Lubona"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="welcome-university" className="mb-1.5 block text-sm font-medium text-ink">University</label>
            <input
              id="welcome-university"
              type="text"
              placeholder="e.g. Copperbelt University"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Get started"}
        </button>
      </form>
    </div>
  )
}
