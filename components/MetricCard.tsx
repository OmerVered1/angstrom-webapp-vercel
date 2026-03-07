interface MetricCardProps {
  label: string
  value: string | number
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border)] border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-black text-[var(--text)] mb-1">{label}</p>
      <p className="text-2xl font-black text-[var(--text-muted)]">{value}</p>
    </div>
  )
}
