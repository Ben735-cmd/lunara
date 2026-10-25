import Image from "next/image"

type Props = {
  size?: number
  showName?: boolean
  className?: string
}

// The Lunara moon mark, recolored to match the app's green palette.
export default function Logo({ size = 36, showName = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo-mark.png"
        alt={showName ? "" : "Lunara"}
        width={size}
        height={size}
        className="rounded-[22%]"
        priority
      />
      {showName && (
        <span className="text-lg font-semibold tracking-tight text-ink">Lunara</span>
      )}
    </span>
  )
}
