'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { formatAlpha, parseTestDate } from '@/lib/utils'
import { dbDelete } from '@/lib/dbClient'
import type { Analysis } from '@/lib/types'

function safe(v: unknown, decimals = 4): string {
  if (v == null || v === 0) return '\u2014'
  return Number(v).toFixed(decimals)
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchData = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return }
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      const sorted = (data as Analysis[]).sort((a, b) =>
        parseTestDate(b.test_date).getTime() - parseTestDate(a.test_date).getTime()
      )
      setAnalyses(sorted)
      if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
    }
    setLoading(false)
  }, [selectedId])

  useEffect(() => { fetchData() }, [fetchData])

  const selected = analyses.find(a => a.id === selectedId) ?? null

  const handleDelete = async () => {
    if (!selected) return
    if (!window.confirm(`Delete analysis "${selected.model_name}" (ID ${selected.id})?`)) return
    setDeleting(true)
    setMsg('')
    const { error } = await dbDelete('analyses', selected.id)
    if (error) {
      setMsg('Failed to delete: ' + error)
    } else {
      setMsg('Deleted!')
      setSelectedId(null)
      await fetchData()
    }
    setDeleting(false)
  }

  const dropdownLabel = (a: Analysis) => {
    const cal = a.use_calibration ? `Cal (Lag: ${a.system_lag ?? 0}s)` : 'No Cal'
    return `${a.model_name} | ${a.test_date} | ${a.analysis_mode} | ${cal}`
  }

  if (!isConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{'\uD83D\uDCC1'} Results History</h1>
        <p className="text-[var(--text-muted)]">Supabase not configured. Set environment variables to view history.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCC1'} Results History</h1>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : analyses.length === 0 ? (
        <p className="text-[var(--text-muted)]">No analyses found.</p>
      ) : (
        <>
          {/* Overview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  {['ID', 'Model', 'Test Date', 'Mode', 'r\u2081', 'r\u2082', '\u03B1 comb (raw)', '\u03B1 phase (raw)', 'Cal', 'T (\u00B0C)'].map(h => (
                    <th key={h} className="px-3 py-2 text-left border-b border-[var(--border)] font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => (
                  <tr key={a.id} className={`cursor-pointer hover:bg-accent/10 ${i % 2 !== 0 ? 'bg-[var(--bg-secondary)]' : ''} ${a.id === selectedId ? 'ring-2 ring-accent ring-inset' : ''}`}
                    onClick={() => setSelectedId(a.id)}>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.id}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs font-medium">{a.model_name}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.test_date}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.analysis_mode}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.r1_mm}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.r2_mm}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{formatAlpha(a.alpha_combined_raw)}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{formatAlpha(a.alpha_phase_raw)}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.use_calibration ? '\u2713' : '\u2717'}</td>
                    <td className="px-3 py-1.5 border-b border-[var(--border)] text-xs">{a.temperature_c ?? '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail view */}
          {selected && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Analysis Detail</h2>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Select Analysis</label>
                <select value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  {analyses.map(a => (
                    <option key={a.id} value={a.id}>{dropdownLabel(a)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: Details */}
                <div className="space-y-2">
                  <table className="w-full text-sm">
                    <tbody>
                      {([
                        ['Created', selected.created_at ? new Date(selected.created_at).toLocaleString() : '\u2014'],
                        ['Model', selected.model_name],
                        ['Test Date', selected.test_date],
                        ['Temperature', `${selected.temperature_c ?? 25} \u00B0C`],
                        ['r\u2081 / r\u2082', `${selected.r1_mm} / ${selected.r2_mm} mm`],
                        ['Period T', `${safe(selected.period_t, 2)} s`],
                        ['Frequency f', `${safe(selected.frequency_f, 6)} Hz`],
                        ['Raw \u0394t', `${safe(selected.raw_lag_dt, 2)} s`],
                        ['\u03B1 Combined (raw)', `${formatAlpha(selected.alpha_combined_raw)} mm\u00B2/s`],
                        ['\u03B1 Phase (raw)', `${formatAlpha(selected.alpha_phase_raw)} mm\u00B2/s`],
                        ...(selected.use_calibration ? [
                          ['System Lag', `${safe(selected.system_lag, 1)} s`],
                          ['Net \u0394t', `${safe(selected.net_lag_dt, 2)} s`],
                          ['\u03B1 Combined (cal)', `${formatAlpha(selected.alpha_combined_cal ?? null)} mm\u00B2/s`],
                          ['\u03B1 Phase (cal)', `${formatAlpha(selected.alpha_phase_cal ?? null)} mm\u00B2/s`],
                        ] : []),
                      ] as [string, string][]).map(([k, v]) => (
                        <tr key={k}>
                          <td className="py-1 pr-4 text-[var(--text-muted)] font-medium">{k}</td>
                          <td className="py-1">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: Actions */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                    <p className="text-sm text-[var(--text-muted)] mb-3">Analysis Mode: <strong>{selected.analysis_mode}</strong></p>
                    <p className="text-sm text-[var(--text-muted)]">Calibration: <strong>{selected.use_calibration ? 'Enabled' : 'Disabled'}</strong></p>
                  </div>

                  <button onClick={handleDelete} disabled={deleting}
                    className="px-5 py-2.5 rounded-lg bg-danger text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                    {deleting ? 'Deleting\u2026' : 'Delete this analysis'}
                  </button>

                  {msg && (
                    <p className={`text-sm font-medium ${msg.includes('Deleted') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {msg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
