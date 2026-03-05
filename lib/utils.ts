export function formatAlpha(value: number | null | undefined): string {
  if (value == null || value === 0) return '—'
  const mm2s = value * 1e6
  return mm2s.toPrecision(4)
}

export function parseTestDate(dateStr: string): Date {
  // Parse DD/MM/YYYY to Date
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(0)
}
