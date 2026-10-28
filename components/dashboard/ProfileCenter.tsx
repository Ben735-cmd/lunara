"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Check, ChevronDown, Lock, Mail, Moon, Settings, Sun, User } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getCurrentUser } from "../../lib/auth"
import { uploadAvatar as uploadAvatarFile } from "../../lib/avatar"
import Onboarding from "./Onboarding"
import { getStoredNotifications, getStoredTheme, storeNotifications } from "../../lib/preferences"

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
}

type Tab = "profile" | "settings" | "notifications"

function Avatar({ url, initials, size }: { url: string; initials: string; size: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-on-accent ${size}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange?: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-default ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  )
}

export default function ProfileCenter({ email, onThemeChange, isDark, onStreakUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [university, setUniversity] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Details to ask a brand-new student for. Set once, when their profile has no name yet.
  const [welcome, setWelcome] = useState<{ userId: string; name: string; avatar: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
      const localNotifications = getStoredNotifications()
      const notificationsOn = localNotifications ?? data.notifications ?? true
      setNotifications(notificationsOn)
      if (localNotifications !== null && localNotifications !== (data.notifications ?? true)) {
        void persist({ notifications: localNotifications })
      }
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
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
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
    const ok = await persist({ full_name: fullName, university, avatar_url: avatarUrl })
    setSaving(false)
    if (!ok) {
      setSaveError(true)
      return
    }
    setSaved(true)
    fetchProfile()
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleDarkMode() {
    const newVal = !isDark
    onThemeChange(newVal) // also remembers it on this device
    await persist({ dark_mode: newVal })
  }

  async function toggleNotifications() {
    const newVal = !notifications
    setNotifications(newVal)
    storeNotifications(newVal)
    await persist({ notifications: newVal })
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) return
    setPasswordSaving(true)
    await supabase.auth.updateUser({ password: newPassword })
    setNewPassword("")
    setPasswordSaving(false)
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  async function uploadAvatar(file: File) {
    const user = await getCurrentUser()
    if (!user) return
    setUploading(true)
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

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0].toUpperCase()

  // Every color below comes from the design tokens, so light and dark mode
  // follow the "dark" class on the dashboard with no per-component palette.
  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
  const labelClass = "mb-1.5 block text-sm font-medium text-ink"
  const card = "rounded-lg border border-line bg-paper p-4"
  const primaryButton =
    "w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"

  const tabs: { id: Tab; label: string; Icon: typeof User }[] = [
    { id: "profile", label: "Profile", Icon: User },
    { id: "settings", label: "Settings", Icon: Settings },
    { id: "notifications", label: "Alerts", Icon: Bell },
  ]

  return (
    <div ref={dropdownRef} className="relative">
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
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-1.5 pr-3 transition-colors hover:bg-paper"
      >
        <Avatar url={avatarUrl} initials={initials} size="h-8 w-8" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-ink">{fullName || "Your name"}</span>
          <span className="block text-xs leading-tight text-ink-muted">{university || "Set your university"}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="text-ink-muted" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Profile and settings"
          className="absolute right-0 top-[calc(100%+8px)] z-[1000] w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-line bg-surface p-5 shadow-lg"
        >
          {/* Identity */}
          <div className="mb-5 flex items-center gap-3.5 border-b border-line pb-5">
            <button
              type="button"
              onClick={() => document.getElementById("avatar-upload")?.click()}
              aria-label="Upload a profile picture"
              className="relative shrink-0 rounded-full"
            >
              <Avatar url={avatarUrl} initials={initials} size="h-14 w-14 text-lg" />
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{fullName || "Your name"}</p>
              <p className="truncate text-xs text-ink-muted">{email}</p>
              <p className="truncate text-xs font-medium text-accent-strong">{university || "No university set"}</p>
            </div>
            <button
              onClick={toggleDarkMode}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-lg border border-line p-2 text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Tabs */}
          <div role="tablist" className="mb-5 flex gap-1 rounded-lg border border-line bg-paper p-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-accent-tint text-accent-strong" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-name" className={labelClass}>Full name</label>
                <input id="profile-name" type="text" placeholder="e.g. Ben Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="profile-university" className={labelClass}>University</label>
                <input id="profile-university" type="text" placeholder="e.g. University of Cape Town" value={university} onChange={(e) => setUniversity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="profile-avatar" className={labelClass}>Profile picture URL</label>
                <p className="mb-1.5 text-xs text-ink-muted">Or select your avatar above to upload one.</p>
                <input id="profile-avatar" type="text" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={inputClass} />
              </div>
              {saveError && (
                <p role="alert" className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger">
                  Could not save. Check your connection and try again.
                </p>
              )}
              <button onClick={saveProfile} disabled={saving} className={`${primaryButton} flex items-center justify-center gap-1.5`}>
                {saving ? "Saving..." : saved ? <><Check size={16} aria-hidden="true" /> Saved</> : "Save profile"}
              </button>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-3">
              <div className={`${card} flex items-center justify-between gap-3`}>
                <div>
                  <p className="text-sm font-medium text-ink">{isDark ? "Dark mode" : "Light mode"}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{isDark ? "Switch to light mode" : "Switch to dark mode"}</p>
                </div>
                <Switch checked={isDark} onChange={toggleDarkMode} label="Dark mode" />
              </div>

              <div className={card}>
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                  <Lock size={15} aria-hidden="true" /> Change password
                </p>
                <label htmlFor="new-password" className="sr-only">New password</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputClass} mb-3`}
                />
                <button onClick={changePassword} disabled={passwordSaving || newPassword.length < 6} className={primaryButton}>
                  {passwordSaving ? "Updating..." : passwordSaved ? "Password updated" : "Update password"}
                </button>
              </div>

              <div className={card}>
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
                  <Mail size={15} aria-hidden="true" /> Email address
                </p>
                <p className="break-all text-sm text-ink-muted">{email}</p>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-3">
              {[
                { label: "Push notifications", desc: "Get notified about due assignments", key: "main" },
                { label: "Assignment reminders", desc: "Remind me 1 day before due date", key: "assignments" },
                { label: "Study streak alerts", desc: "Don't break your streak", key: "streak" },
                { label: "Weekly summary", desc: "Weekly progress report", key: "weekly" },
              ].map((item) => {
                const isMain = item.key === "main"
                return (
                  <div key={item.key} className={`${card} flex items-center justify-between gap-3`}>
                    <div>
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{item.desc}</p>
                    </div>
                    <Switch
                      checked={isMain ? notifications : true}
                      onChange={isMain ? toggleNotifications : undefined}
                      disabled={!isMain}
                      label={item.label}
                    />
                  </div>
                )
              })}
              <p className="pt-1 text-center text-xs text-ink-muted">More notification settings coming soon</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
