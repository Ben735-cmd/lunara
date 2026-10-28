// Settings kept on this device so they apply instantly on every refresh, before
// anything is fetched. The profile in Supabase mirrors them for other devices.

const THEME_KEY = "lunara-theme"
const NOTIFICATIONS_KEY = "lunara-notifications"

export function getStoredTheme(): boolean | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === "dark" ? true : value === "light" ? false : null
  } catch {
    return null
  }
}

export function storeTheme(dark: boolean) {
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light")
  } catch {
    // Private mode or blocked storage: the choice still lasts for this visit.
  }
}

/** The saved choice, or light mode if nothing is saved yet. */
export function initialTheme() {
  return getStoredTheme() ?? false
}

export function getStoredNotifications(): boolean | null {
  try {
    const value = localStorage.getItem(NOTIFICATIONS_KEY)
    return value === "on" ? true : value === "off" ? false : null
  } catch {
    return null
  }
}

export function storeNotifications(on: boolean) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, on ? "on" : "off")
  } catch {
    // ignore
  }
}

/** Puts the "dark" class on the page so the background and every screen follow it. */
export function applyThemeClass(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
}
