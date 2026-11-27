"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Camera, Check, ChevronDown, ChevronRight, LogOut, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { uploadAvatar as uploadAvatarFile } from "../../lib/avatar"
import Onboarding from "./Onboarding"
import { getStoredTheme } from "../../lib/preferences"
import { useDialog } from "../../lib/useDialog"
import ReminderCard from "../ui/ReminderCard"

type Profile = {
  id?: string
  user_id: string
  full_name: string
  university: string
  avatar_url: string
  dark_mode: boolean
  notifications: boolean
  study_streak?: number
  last_active_date?: string
}

type Props = {
  email: string
  onThemeChange: (dark: boolean) => void
  isDark: boolean
  onStreakUpdate: (streak: number) => void
  logout: () => void
}

function Avatar({ url, initials, size }: { url: string; initials: string; size: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-on-accent ${size}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The account screen: full screen on phones, a side panel on wider screens.
 * It is rendered on the body so page animations can't trap or cover it.
 */
function AccountPanel({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useDialog<HTMLDivElement>(true, onClose)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return createPortal(
    <div className="anim-fade fixed inset-0 z-[60] flex justify-end bg-black/45" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-paper text-ink shadow-2xl sm:max-w-md sm:border-l sm:border-line"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface pl-5 pr-3">
          <h2 className="text-lg font-semibold">Account</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ProfileCenter({ email, onThemeChange, isDark, onStreakUpdate, logout }: Props) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [university, setUniversity] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Details to ask a brand-new student for. Set once, when their profile has no name yet.
  const [welcome, setWelcome] = useState<{ userId: string; name: string; avatar: string } | null>(null)

  async function updateStudyStreak(userId: string, currentStreak: number, lastActiveDate: string) {
    const today = new Date().toISOString().split("T")[0]

    if (lastActiveDate === today) {
      onStreakUpdate(currentStreak)
      return
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const newStreak = lastActiveDate === yesterdayStr ? currentStreak + 1 : 1

    await supabase
      .from("profiles")
      .update({ study_streak: newStreak, last_active_date: today })
      .eq("user_id", userId)

    onStreakUpdate(newStreak)
  }

  // Google accounts already carry a name and picture, so offer those as the starting point.
  function askForDetails(user: { id: string; user_metadata?: Record<string, unknown> }) {
    const meta = user.user_metadata ?? {}
    const name = String(meta.full_name ?? meta.name ?? "")
    const avatar = String(meta.avatar_url ?? meta.picture ?? "")
    setWelcome({ userId: user.id, name, avatar })
  }

  async function saveWelcome(values: { fullName: string; university: string; avatarUrl: string }) {
    const ok = await persist({ full_name: values.fullName, university: values.university, avatar_url: values.avatarUrl })
    if (ok) {
      setFullName(values.fullName)
      setUniversity(values.university)
      setAvatarUrl(values.avatarUrl)
      setProfile((p) => p && { ...p, full_name: values.fullName, university: values.university, avatar_url: values.avatarUrl })
      setWelcome(null)
    }
    return ok
  }

  async function fetchProfile() {
    const user = await getCurrentUser()
    if (!user) return

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (data) {
      setProfile(data)
      setFullName(data.full_name || "")
      setUniversity(data.university || "")
      setAvatarUrl(data.avatar_url || "")
      // The choice saved on this device wins, so a refresh never undoes it.
      // A device with nothing saved yet takes the profile's setting instead.
      const localTheme = getStoredTheme()
      if (localTheme === null) onThemeChange(!!data.dark_mode)
      else if (localTheme !== !!data.dark_mode) void persist({ dark_mode: localTheme })
      updateStudyStreak(user.id, data.study_streak || 0, data.last_active_date || "")
      if (!data.full_name) askForDetails(user)
    } else {
      const newProfile: Profile = {
        user_id: user.id,
        full_name: "",
        university: "",
        avatar_url: "",
        dark_mode: false,
        notifications: true,
        study_streak: 0,
        last_active_date: "",
      }
      await supabase.from("profiles").insert([newProfile])
      setProfile(newProfile)
      onStreakUpdate(0)
      askForDetails(user)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // Writes only the fields given, so saving one setting never overwrites another.
  // Returns false when the save did not go through.
  async function persist(patch: Partial<Profile>): Promise<boolean> {
    const user = await getCurrentUser()
    if (!user) return false
    const { data, error } = await supabase.from("profiles").update(patch).eq("user_id", user.id).select("user_id")
    if (error) {
      console.error("Could not save profile:", error.message)
      return false
    }
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from("profiles").insert([{ user_id: user.id, ...patch }])
      if (insertError) {
        console.error("Could not create profile:", insertError.message)
        return false
      }
    }
    return true
  }

  async function saveProfile() {
    setSaving(true)
    setSaveError(false)
    const ok = await persist({ full_name: fullName, university })
    setSaving(false)
    if (!ok) {
      setSaveError(true)
      return
    }
    setProfile((p) => p && { ...p, full_name: fullName, university })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleDarkMode() {
    const newVal = !isDark
    onThemeChange(newVal) // also remembers it on this device
    await persist({ dark_mode: newVal })
  }

  async function changePassword() {
    if (newPassword.length < 6) return
    setPasswordSaving(true)
    setPasswordError("")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewPassword("")
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  async function uploadAvatar(file: File) {
    const user = await getCurrentUser()
    if (!user) return
    setUploading(true)
    setSaveError(false)
    try {
      const url = await uploadAvatarFile(user.id, file)
      setAvatarUrl(url)
      await persist({ avatar_url: url })
    } catch (err) {
      console.error("Could not upload the picture:", err)
      setSaveError(true)
    }
    setUploading(false)
  }

  async function removeAvatar() {
    setSaveError(false)
    if (await persist({ avatar_url: "" })) setAvatarUrl("")
    else setSaveError(true)
  }

  const changed = fullName !== (profile?.full_name ?? "") || university !== (profile?.university ?? "")

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0].toUpperCase()

  // Every color below comes from the design tokens, so light and dark mode
  // follow the "dark" class on the page with no per-component palette.
  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
  const labelClass = "mb-1.5 block text-sm font-medium text-ink"
  const card = "rounded-xl border border-line bg-surface"
  const row = "flex items-center justify-between gap-3 px-4 py-3.5"
  const primaryButton =
    "w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="relative">
      {welcome && (
        <Onboarding
          userId={welcome.userId}
          email={email}
          initialName={welcome.name}
          initialAvatar={welcome.avatar}
          onSave={saveWelcome}
        />
      )}
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Profile and settings"
        className="flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-surface md:pr-3"
      >
        <Avatar url={avatarUrl} initials={initials} size="h-9 w-9 text-sm" />
        <span className="hidden text-left md:block">
          <span className="block text-sm font-medium leading-tight text-ink">{fullName || "Your name"}</span>
          <span className="block text-xs leading-tight text-ink-muted">{university || "Set your university"}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="hidden text-ink-muted md:block" />
      </button>

      {open && (
        <AccountPanel onClose={() => setOpen(false)}>
          {/* Identity */}
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => document.getElementById("avatar-upload")?.click()}
              aria-label="Change profile photo"
              className="relative rounded-full"
            >
              <Avatar url={avatarUrl} initials={initials} size="h-20 w-20 text-2xl" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm">
                <Camera size={14} aria-hidden="true" />
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              )}
            </button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
            />
            <p className="mt-3 max-w-full truncate text-lg font-semibold text-ink">{profile?.full_name || "Your name"}</p>
            <p className="max-w-full truncate text-sm text-ink-muted">{email}</p>
            {avatarUrl && (
              <button onClick={removeAvatar} className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:text-danger">
                Remove photo
              </button>
            )}
          </div>

          {saveError && (
            <p role="alert" className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger">
              Could not save. Check your connection and try again.
            </p>
          )}

          <Section title="Personal details">
            <form onSubmit={(e) => { e.preventDefault(); if (changed) saveProfile() }} className={`${card} space-y-4 p-4`}>
              <div>
                <label htmlFor="profile-name" className={labelClass}>Full name</label>
                <input id="profile-name" type="text" autoComplete="name" placeholder="e.g. Ben Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="profile-university" className={labelClass}>University</label>
                <input id="profile-university" type="text" placeholder="e.g. University of Cape Town" value={university} onChange={(e) => setUniversity(e.target.value)} className={inputClass} />
              </div>
              <button type="submit" disabled={saving || !changed} className={`${primaryButton} flex items-center justify-center gap-1.5`}>
                {saving ? "Saving..." : saved && !changed ? <><Check size={16} aria-hidden="true" /> Saved</> : "Save changes"}
              </button>
            </form>
          </Section>

          <Section title="Appearance">
            <div className={`${card} ${row}`}>
              <div>
                <p className="text-sm font-medium text-ink">Dark mode</p>
                <p className="mt-0.5 text-xs text-ink-muted">Easier on the eyes at night</p>
              </div>
              <Switch checked={isDark} onChange={toggleDarkMode} label="Dark mode" />
            </div>
          </Section>

          {profile && (
            <Section title="Notifications">
              <ReminderCard userId={profile.user_id} description="Get reminders from Lunara on this device." />
            </Section>
          )}

          <Section title="Security">
            <div className={`${card} divide-y divide-line`}>
              <div className="px-4 py-3.5">
                <p className="text-sm font-medium text-ink">Email</p>
                <p className="mt-0.5 break-all text-sm text-ink-muted">{email}</p>
              </div>
              <div>
                <button onClick={() => setShowPassword(!showPassword)} aria-expanded={showPassword} className={`${row} w-full text-left`}>
                  <span className="text-sm font-medium text-ink">Change password</span>
                  <ChevronRight size={18} aria-hidden="true" className={`text-ink-muted transition-transform ${showPassword ? "rotate-90" : ""}`} />
                </button>
                {showPassword && (
                  <form onSubmit={(e) => { e.preventDefault(); changePassword() }} className="space-y-3 px-4 pb-4">
                    <label htmlFor="new-password" className="sr-only">New password</label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="New password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                    />
                    {passwordError && <p role="alert" className="text-sm text-danger">{passwordError}</p>}
                    <button type="submit" disabled={passwordSaving || newPassword.length < 6} className={primaryButton}>
                      {passwordSaving ? "Updating..." : passwordSaved ? "Password updated" : "Update password"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Section>

          <button
            onClick={() => { setOpen(false); logout() }}
            className={`${card} flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger-tint`}
          >
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
        </AccountPanel>
      )}
    </div>
  )
}
