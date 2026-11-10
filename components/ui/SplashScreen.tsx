import Image from "next/image"

const NAME = "Lunara"
const STARS = [
  { top: "14%", left: "18%", delay: 0.2, size: 3 },
  { top: "22%", left: "78%", delay: 1.1, size: 2 },
  { top: "34%", left: "10%", delay: 0.7, size: 2 },
  { top: "30%", left: "88%", delay: 1.8, size: 3 },
  { top: "68%", left: "14%", delay: 1.4, size: 2 },
  { top: "74%", left: "84%", delay: 0.4, size: 3 },
  { top: "84%", left: "40%", delay: 2.1, size: 2 },
  { top: "10%", left: "52%", delay: 1.6, size: 2 },
]

/** The loading screen: the name rises in above the logo, the moon floats and glows, and a light sweeps along a bar. */
export default function SplashScreen() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading Lunara"
      className="dark relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#051C12] px-6"
    >
      <div aria-hidden="true" className="splash-glow absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] rounded-full" />
      {STARS.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="bg-star absolute -z-10 rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}

      <h1 className="splash-name flex text-5xl font-semibold tracking-[0.18em] text-white sm:text-6xl" aria-label={NAME}>
        {NAME.split("").map((letter, i) => (
          <span key={i} aria-hidden="true" className="splash-letter" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
            {letter}
          </span>
        ))}
      </h1>

      <div className="splash-moon relative mt-10 flex h-28 w-28 items-center justify-center">
        <span aria-hidden="true" className="splash-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#7fe0bf] shadow-[0_0_10px_2px_#7fe0bf]" />
        </span>
        <span className="logo-mark">
          <Image src="/logo-mark.png" alt="" width={84} height={84} priority className="rounded-[22%]" />
        </span>
      </div>

      <div aria-hidden="true" className="splash-bar mt-12 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <span className="splash-bar-fill block h-full w-1/2 rounded-full bg-[#7fe0bf]" />
      </div>
      <p className="splash-hint mt-4 text-sm text-white/60">Getting your study space ready</p>
    </main>
  )
}
