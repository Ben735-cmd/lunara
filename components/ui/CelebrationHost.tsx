"use client"

import { useEffect, useState } from "react"
import { CELEBRATE_EVENT, type CelebrateOptions } from "../../lib/celebrate"

type Piece = { id: number; dx: number; dy: number; rot: number; size: number; color: string; round: boolean; delay: number }
type Burst = { id: number; x: number; y: number; pieces: Piece[] }

const COLORS = ["var(--accent)", "var(--accent-strong)", "#f5c542", "#ffffff", "#7fe0bf", "#f59fb0"]

function makeBurst(id: number, { x, y, big }: CelebrateOptions): Burst {
  const w = window.innerWidth
  const h = window.innerHeight
  const count = big ? 56 : 28
  const spread = big ? 260 : 150
  const pieces = Array.from({ length: count }, (_, i): Piece => {
    const angle = Math.random() * Math.PI * 2
    const dist = spread * (0.45 + Math.random() * 0.75)
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 40,
      rot: (Math.random() - 0.5) * 900,
      size: 5 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      round: Math.random() < 0.4,
      delay: Math.random() * 0.08,
    }
  })
  return { id, x: x ?? w / 2, y: y ?? h * (big ? 0.4 : 0.35), pieces }
}

/** Draws confetti bursts above everything. Never takes clicks and clears itself afterwards. */
export default function CelebrationHost() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let counter = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const onCelebrate = (e: Event) => {
      const burst = makeBurst(++counter, (e as CustomEvent<CelebrateOptions>).detail ?? {})
      setBursts((b) => [...b, burst])
      const t = setTimeout(() => {
        setBursts((b) => b.filter((x) => x.id !== burst.id))
        timers.delete(t)
      }, 1800)
      timers.add(t)
    }
    window.addEventListener(CELEBRATE_EVENT, onCelebrate)
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate)
      timers.forEach(clearTimeout)
    }
  }, [])

  if (bursts.length === 0) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
      {bursts.map((b) => (
        <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
          {b.pieces.map((p) => (
            <span
              key={p.id}
              className="confetti-piece absolute block"
              style={{
                width: p.size,
                height: p.round ? p.size : p.size * 0.5,
                background: p.color,
                borderRadius: p.round ? "9999px" : "1px",
                animationDelay: `${p.delay}s`,
                ["--dx" as string]: `${p.dx}px`,
                ["--dy" as string]: `${p.dy}px`,
                ["--rot" as string]: `${p.rot}deg`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
