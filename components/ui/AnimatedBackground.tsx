// A slow, soft background for the app: drifting green glows and a few twinkling
// stars (a nod to the Lunara moon). It sits behind everything, never takes
// clicks, and only animates transform and opacity so it stays cheap on phones.
// Motion is switched off for people who prefer reduced motion (see globals.css).
// The parent must create a stacking context (use "relative isolate").

// Fixed positions so server and browser render the same markup.
const STARS = [
  [8, 12, 0], [18, 64, 1.2], [26, 28, 2.1], [34, 82, 0.6], [43, 8, 1.7], [52, 46, 2.6],
  [61, 90, 0.3], [69, 22, 1.4], [77, 58, 2.9], [85, 14, 0.9], [92, 74, 2.3], [14, 92, 1.9],
  [38, 52, 3.2], [57, 70, 0.4], [73, 40, 3.6], [88, 34, 1.1],
] as const

export default function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-blob bg-blob-a absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/[0.17] blur-3xl" />
      <div className="bg-blob bg-blob-b absolute -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-accent/[0.13] blur-3xl" />
      <div className="bg-blob bg-blob-c absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/[0.17] blur-3xl" />
      {STARS.map(([top, left, delay], i) => (
        <span
          key={i}
          className="bg-star absolute h-1.5 w-1.5 rounded-full bg-accent"
          style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}
