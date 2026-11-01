"use client"

import { useEffect, useState } from "react"

/** Counts up to a number (keeps any suffix such as "%") the first time it appears and whenever it changes. */
export default function CountUp({ value, duration = 700 }: { value: number | string; duration?: number }) {
  const text = String(value)
  const match = text.match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  const target = match ? Number(match[1]) : NaN
  const suffix = match ? match[2] : ""
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (Number.isNaN(target)) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || target === 0) {
      setShown(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  if (Number.isNaN(target)) return <>{text}</>
  return <span aria-label={text}>{shown}{suffix}</span>
}
