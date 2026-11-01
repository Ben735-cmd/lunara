import Image from "next/image"

type Props = {
  size?: number
  showName?: boolean
  className?: string
}

// The Lunara moon mark, recolored to match the app's green palette.
export default function Logo({ size = 36, showName = true, className = "" }: Props) {
  return (
    <span className={`logo-link inline-flex items-center gap-3 ${className}`}>
      <span className="logo-mark">
      <Image
        src="/logo-mark.png"
        alt={showName ? "" : "Lunara"}
        width={size}
        height={size}
        className="rounded-[22%]"
        priority
      />
      </span>
      {showName && (
        <span className="text-lg font-semibold tracking-tight text-ink">Lunara</span>
      )}
    </span>
  )
}
