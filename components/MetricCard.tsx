interface MetricCardProps {
  label: string
  value: string | number
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg p-5 bg-[var(--bg-secondary)] border border-[var(--border)]">
      <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
