/** Fires a confetti burst. CelebrationHost (mounted once in the dashboard) listens and draws it. */
export const CELEBRATE_EVENT = "lunara:celebrate"

export type CelebrateOptions = { x?: number; y?: number; big?: boolean }

export function celebrate(options: CelebrateOptions = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<CelebrateOptions>(CELEBRATE_EVENT, { detail: options }))
}
