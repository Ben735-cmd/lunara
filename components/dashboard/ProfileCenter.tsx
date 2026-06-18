"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"

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

export default function ProfileCenter({ email, onThemeChange, isDark, onStreakUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "notifications">("profile")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [university, setUniversity] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
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
      setNotifications(data.notifications ?? true)
      if (data.dark_mode !== isDark) onThemeChange(data.dark_mode)
      updateStudyStreak(user.id, data.study_streak || 0, data.last_active_date || "")
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

  async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: fullName,
      university,
      avatar_url: avatarUrl,
      dark_mode: isDark,
      notifications,
    }, { onConflict: "user_id" })
    setSaving(false)
    setSaved(true)
    fetchProfile()
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleDarkMode() {
    const newVal = !isDark
    onThemeChange(newVal)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: fullName,
      university,
      avatar_url: avatarUrl,
      dark_mode: newVal,
      notifications,
    }, { onConflict: "user_id" })
  }

  async function toggleNotifications() {
    const newVal = !notifications
    setNotifications(newVal)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: fullName,
      university,
      avatar_url: avatarUrl,
      dark_mode: isDark,
      notifications: newVal,
    }, { onConflict: "user_id" })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}.${fileExt}`
    const { error } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      setAvatarUrl(data.publicUrl)
    }
    setUploading(false)
  }

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0].toUpperCase()

  const c = isDark ? {
    bg: "#0D0D1A", border: "rgba(255,255,255,0.08)",
    text: "#FFFFFF", subtext: "#64748B",
    card: "#1A1A2E", cardBorder: "rgba(255,255,255,0.06)",
    input: "#0D0D1A", inputBorder: "rgba(255,255,255,0.1)",
    inputText: "#E2E8F0", tabInactive: "#334155",
  } : {
    bg: "#FFFFFF", border: "#E2E8F0",
    text: "#0F172A", subtext: "#94A3B8",
    card: "#F8FAFF", cardBorder: "#F1F5F9",
    input: "#FFFFFF", inputBorder: "#E2E8F0",
    inputText: "#0F172A", tabInactive: "#94A3B8",
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: isDark ? "rgba(255,255,255,0.05)" : "white",
          border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
          borderRadius: "16px", padding: "8px 14px",
          cursor: "pointer", transition: "all 0.2s",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{
          width: "36px", height: "36px", borderRadius: "12px",
          background: avatarUrl ? "transparent" : "linear-gradient(135deg, #8B5CF6, #3B82F6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "white", fontWeight: 700, fontSize: "0.85rem" }}>{initials}</span>
          )}
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ fontWeight: 700, fontSize: "0.85rem", color: isDark ? "#FFFFFF" : "#0F172A", lineHeight: 1.2 }}>
            {fullName || "Your Name"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#94A3B8", lineHeight: 1.2 }}>
            {university || "Set your university"}
          </p>
        </div>
        <span style={{ color: "#94A3B8", fontSize: "0.7rem", marginLeft: "4px" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 12px)", right: 0,
          width: "360px", background: c.bg,
          border: `1.5px solid ${c.border}`,
          borderRadius: "24px", padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${c.cardBorder}` }}>
            <div
              onClick={() => document.getElementById("avatar-upload")?.click()}
              style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: avatarUrl ? "transparent" : "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", cursor: "pointer", flexShrink: 0,
                border: "2px solid rgba(139,92,246,0.3)", position: "relative",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}>{initials}</span>
              )}
              {uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: c.text, fontSize: "1rem" }}>{fullName || "Your Name"}</p>
              <p style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: "2px" }}>{email}</p>
              <p style={{ color: "#8B5CF6", fontSize: "0.75rem", marginTop: "2px", fontWeight: 600 }}>{university || "No university set"}</p>
            </div>
            <button
              onClick={toggleDarkMode}
              style={{
                background: isDark ? "rgba(139,92,246,0.2)" : "#F1F5F9",
                border: isDark ? "1px solid rgba(139,92,246,0.3)" : "1px solid #E2E8F0",
                borderRadius: "12px", padding: "8px 10px",
                cursor: "pointer", fontSize: "1.1rem", transition: "all 0.2s",
              }}
            >{isDark ? "☀️" : "🌙"}</button>
          </div>

          <div style={{ display: "flex", gap: "4px", background: c.card, borderRadius: "14px", padding: "4px", marginBottom: "20px", border: `1px solid ${c.cardBorder}` }}>
            {([
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "settings", label: "Settings", icon: "⚙️" },
              { id: "notifications", label: "Alerts", icon: "🔔" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: "10px", border: "none",
                  background: activeTab === tab.id ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "transparent",
                  color: activeTab === tab.id ? "white" : c.tabInactive,
                  fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  transition: "all 0.2s",
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: c.subtext, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
                <input type="text" placeholder="e.g. Ben Smith" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${c.inputBorder}`, borderRadius: "12px", padding: "10px 14px", fontSize: "0.875rem", outline: "none", background: c.input, color: c.inputText }} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: c.subtext, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>University</label>
                <input type="text" placeholder="e.g. University of Cape Town" value={university} onChange={(e) => setUniversity(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${c.inputBorder}`, borderRadius: "12px", padding: "10px 14px", fontSize: "0.875rem", outline: "none", background: c.input, color: c.inputText }} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: c.subtext, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Profile Picture URL</label>
                <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "6px" }}>Or click your avatar above to upload</p>
                <input type="text" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${c.inputBorder}`, borderRadius: "12px", padding: "10px 14px", fontSize: "0.875rem", outline: "none", background: c.input, color: c.inputText }} />
              </div>
              <button onClick={saveProfile} disabled={saving}
                style={{ width: "100%", marginTop: "4px", background: saved ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #8B5CF6, #3B82F6)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "all 0.3s" }}
              >{saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}</button>
            </div>
          )}

          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: "16px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: c.text, fontSize: "0.875rem" }}>{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</p>
                    <p style={{ color: c.subtext, fontSize: "0.75rem", marginTop: "2px" }}>{isDark ? "Switch to light mode" : "Switch to dark mode"}</p>
                  </div>
                  <div onClick={toggleDarkMode} style={{ width: "48px", height: "26px", borderRadius: "99px", background: isDark ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "#E2E8F0", cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                    <div style={{ position: "absolute", top: "3px", left: isDark ? "25px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "white", transition: "left 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              </div>

              <div style={{ background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: "16px", padding: "16px" }}>
                <p style={{ fontWeight: 600, color: c.text, fontSize: "0.875rem", marginBottom: "12px" }}>🔒 Change Password</p>
                <input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${c.inputBorder}`, borderRadius: "12px", padding: "10px 14px", fontSize: "0.875rem", outline: "none", background: c.input, color: c.inputText, marginBottom: "10px" }} />
                <button onClick={changePassword} disabled={passwordSaving || newPassword.length < 6}
                  style={{ width: "100%", background: passwordSaved ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #8B5CF6, #3B82F6)", border: "none", borderRadius: "12px", padding: "10px", color: "white", fontWeight: 700, fontSize: "0.85rem", cursor: passwordSaving || newPassword.length < 6 ? "not-allowed" : "pointer", opacity: newPassword.length < 6 ? 0.5 : 1, transition: "all 0.3s" }}
                >{passwordSaving ? "Updating..." : passwordSaved ? "✓ Updated!" : "Update Password"}</button>
              </div>

              <div style={{ background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: "16px", padding: "16px" }}>
                <p style={{ fontWeight: 600, color: c.text, fontSize: "0.875rem", marginBottom: "4px" }}>📧 Email Address</p>
                <p style={{ color: "#94A3B8", fontSize: "0.82rem" }}>{email}</p>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Push Notifications", desc: "Get notified about due assignments", key: "main" },
                { label: "Assignment Reminders", desc: "Remind me 1 day before due date", key: "assignments" },
                { label: "Study Streak Alerts", desc: "Don't break your streak!", key: "streak" },
                { label: "Weekly Summary", desc: "Weekly progress report", key: "weekly" },
              ].map((item) => (
                <div key={item.key} style={{ background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: "16px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: c.text, fontSize: "0.85rem" }}>{item.label}</p>
                    <p style={{ color: c.subtext, fontSize: "0.75rem", marginTop: "2px" }}>{item.desc}</p>
                  </div>
                  <div onClick={item.key === "main" ? toggleNotifications : undefined}
                    style={{ width: "44px", height: "24px", borderRadius: "99px", background: (item.key === "main" ? notifications : true) ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "#E2E8F0", cursor: item.key === "main" ? "pointer" : "default", position: "relative", transition: "all 0.3s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: "2px", left: (item.key === "main" ? notifications : true) ? "22px" : "2px", width: "20px", height: "20px", borderRadius: "50%", background: "white", transition: "left 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              ))}
              <p style={{ color: c.subtext, fontSize: "0.75rem", textAlign: "center", marginTop: "4px" }}>More notification settings coming soon</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}