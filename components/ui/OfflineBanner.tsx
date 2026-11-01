"use client"

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"
import { useOnline } from "../../lib/online"

/** A slim notice at the top of the screen while the connection is down, and a short "Back online" note after. */
export default function OfflineBanner() {
  const online = useOnline()
  const [justBack, setJustBack] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!online) {
      setWasOffline(true)
      setJustBack(false)
      return
    }
    if (!wasOffline) return
    setJustBack(true)
    const t = setTimeout(() => { setJustBack(false); setWasOffline(false) }, 3000)
    return () => clearTimeout(t)
  }, [online, wasOffline])

  if (online && !justBack) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={`anim-pop fixed bottom-5 left-1/2 z-[90] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${
        online ? "bg-accent text-on-accent" : "bg-ink text-paper"
      }`}
    >
      {online ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
      {online ? "Back online" : "You're offline. Notes still work."}
    </div>
  )
}
