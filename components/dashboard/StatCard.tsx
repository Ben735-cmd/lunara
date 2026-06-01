type StatCardProps = {
  title: string
  value: string
  gradient: string
}

export default function StatCard({
  title,
  value,
  gradient,
}: StatCardProps) {
  return (
    <div
      className={`rounded-3xl p-6 text-white ${gradient}`}
    >
      <p className="text-white/70 text-sm">
        {title}
      </p>

      <h2 className="text-5xl font-bold mt-4">
        {value}
      </h2>
    </div>
  )
}