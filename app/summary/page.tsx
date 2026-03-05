'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { formatAlpha, parseTestDate } from '@/lib/utils'
import type { Analysis } from '@/lib/types'

const DISPLAY_COLS: { key: keyof Analysis; label: string; fmt?: (v: unknown) => string; editable?: boolean }[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'model_name', label: 'Model', editable: true },
  { key: 'test_date', label: 'Date', editable: true },
  { key: 'temperature_c', label: 'T (\u00B0C)', fmt: v => v != null ? Number(v).toFixed(1) : '25.0', editable: true },
  { key: 'analysis_mode', label: 'Mode', editable: true },
  { key: 'r1_mm', label: 'r\u2081 (mm)', fmt: v => Number(v).toFixed(2), editable: true },
  { key: 'r2_mm', label: 'r\u2082 (mm)', fmt: v => Number(v).toFixed(2), editable: true },
  { key: 'amplitude_a1', label: 'A\u2081 (mW)', fmt: v => Number(v).toFixed(4), editable: true },
  { key: 'amplitude_a2', label: 'A\u2082 (mW)', fmt: v => Number(v).toFixed(4), editable: true },
  { key: 'period_t', label: 'Period (s)', fmt: v => Number(v).toFixed(2), editable: true },
  { key: 'raw_lag_dt', label: '\u0394t (s)', fmt: v => Number(v).toFixed(2), editable: true },
  { key: 'raw_phase_phi', label: '\u03C6 (rad)', fmt: v => Number(v).toFixed(4), editable: true },
  { key: 'ln_term', label: 'ln term', fmt: v => Number(v).toFixed(4), editable: true },
  { key: 'alpha_combined_raw', label: '\u03B1 comb (raw)', fmt: v => formatAlpha(Number(v)), editable: true },
  { key: 'alpha_phase_raw', label: '\u03B1 phase (raw)', fmt: v => formatAlpha(Number(v)), editable: true },
  { key: 'use_calibration', label: 'Cal', fmt: v => v ? '\u2713' : '\u2717', editable: true },
  { key: 'system_lag', label: 'Lag (s)', fmt: v => v != null ? Number(v).toFixed(1) : '\u2014', editable: true },
  { key: 'alpha_combined_cal', label: '\u03B1 comb (cal)', fmt: v => formatAlpha(Number(v)), editable: true },
  { key: 'alpha_phase_cal', label: '\u03B1 phase (cal)', fmt: v => formatAlpha(Number(v)), editable: true },
]

export default function SummaryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [filterModel, setFilterModel] = useState('All')
  const [filterMode, setFilterMode] = useState('All')
  const [filterCal, setFilterCal] = useState('All')

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
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const uniqueModels = useMemo(() => Array.from(new Set(analyses.map(a => a.model_name))), [analyses])
  const uniqueModes = useMemo(() => Array.from(new Set(analyses.map(a => a.analysis_mode))), [analyses])

  const filtered = useMemo(() => {
    return analyses.filter(a => {
      if (filterModel !== 'All' && a.model_name !== filterModel) return false
      if (filterMode !== 'All' && a.analysis_mode !== filterMode) return false
      if (filterCal === 'Calibrated Only' && !a.use_calibration) return false
      if (filterCal === 'Non-Calibrated Only' && a.use_calibration) return false
      return true
    })
  }, [analyses, filterModel, filterMode, filterCal])

  const stats = useMemo(() => {
    const combRaw = filtered.filter(a => a.alpha_combined_raw > 0).map(a => a.alpha_combined_raw)
    const combCal = filtered.filter(a => (a.alpha_combined_cal ?? 0) > 0).map(a => a.alpha_combined_cal!)
    return {
      total: filtered.length,
      models: new Set(filtered.map(a => a.model_name)).size,
      avgRaw: combRaw.length ? (combRaw.reduce((s, v) => s + v, 0) / combRaw.length * 1e6).toPrecision(4) + ' mm\u00B2/s' : '\u2014',
      avgCal: combCal.length ? (combCal.reduce((s, v) => s + v, 0) / combCal.length * 1e6).toPrecision(4) + ' mm\u00B2/s' : '\u2014',
    }
  }, [filtered])

  const startEdit = (a: Analysis) => {
    setEditingId(a.id)
    setEditRow({ ...a })
    setMsg('')
  }

  const cancelEdit = () => { setEditingId(null); setEditRow({}) }

  const saveEdit = async () => {
    if (editingId == null) return
    setSaving(true); setMsg('')
    const { id: _id, created_at: _ca, graph_image: _gi, extra_data: _ed, ...updateData } = editRow as unknown as Analysis
    const { error } = await supabase.from('analyses').update(updateData).eq('id', editingId)
    if (error) {
      setMsg('Save failed: ' + error.message)
    } else {
      setMsg('Saved!')
      setEditingId(null)
      await fetchData()
    }
    setSaving(false)
  }

  const handleCSVDownload = () => {
    const header = DISPLAY_COLS.map(c => c.label).join(',')
    const rows = filtered.map(a =>
      DISPLAY_COLS.map(c => {
        const v = a[c.key]
        if (c.fmt) return c.fmt(v)
        return v ?? ''
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url; el.download = 'angstrom_results_summary.csv'; el.click()
    URL.revokeObjectURL(url)
  }

  if (!isConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{'\uD83D\uDCCB'} Results Summary</h1>
        <p className="text-[var(--text-muted)]">Supabase not configured. Set environment variables to view results.</p>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto space-y-6 px-4">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCCB'} Results Summary</h1>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Filter by Model</label>
          <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
            <option>All</option>
            {uniqueModels.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Filter by Mode</label>
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
            <option>All</option>
            {uniqueModes.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Filter by Calibration</label>
          <select value={filterCal} onChange={e => setFilterCal(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
            <option>All</option>
            <option>Calibrated Only</option>
            <option>Non-Calibrated Only</option>
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {([
          ['Total Analyses', stats.total],
          ['Unique Models', stats.models],
          ['Avg \u03B1 (raw)', stats.avgRaw],
          ['Avg \u03B1 (cal)', stats.avgCal],
        ] as [string, string | number][]).map(([label, value]) => (
          <div key={label} className="rounded-lg p-4 bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-sm font-medium ${msg.includes('Saved') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          {msg}
        </p>
      )}

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--text-muted)]">No analyses found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border border-[var(--border)] whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                {DISPLAY_COLS.map(c => (
                  <th key={c.key} className="px-2 py-2 text-left border-b border-[var(--border)] font-semibold">{c.label}</th>
                ))}
                <th className="px-2 py-2 border-b border-[var(--border)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, ri) => (
                <tr key={a.id} className={ri % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]'}>
                  {DISPLAY_COLS.map(c => {
                    const v = a[c.key]
                    const isEditing = editingId === a.id && c.editable
                    return (
                      <td key={c.key} className="px-2 py-1.5 border-b border-[var(--border)]">
                        {isEditing ? (
                          c.key === 'use_calibration' ? (
                            <input type="checkbox" checked={!!editRow[c.key]}
                              onChange={e => setEditRow(r => ({ ...r, [c.key]: e.target.checked }))}
                              className="accent-accent" />
                          ) : c.key === 'analysis_mode' ? (
                            <select value={String(editRow[c.key] ?? '')}
                              onChange={e => setEditRow(r => ({ ...r, [c.key]: e.target.value }))}
                              className="px-1 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded text-xs w-16">
                              <option>Auto</option><option>Manual</option>
                            </select>
                          ) : (
                            <input type="text"
                              value={String(editRow[c.key] ?? '')}
                              onChange={e => setEditRow(r => ({ ...r, [c.key]: e.target.value }))}
                              className="px-1 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded text-xs w-20" />
                          )
                        ) : (
                          c.fmt ? c.fmt(v) : String(v ?? '\u2014')
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 border-b border-[var(--border)]">
                    {editingId === a.id ? (
                      <div className="flex gap-1">
                        <button onClick={saveEdit} disabled={saving}
                          className="px-2 py-0.5 rounded bg-success text-white text-xs hover:opacity-90">
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-xs hover:opacity-80">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(a)}
                        className="px-2 py-0.5 rounded bg-accent text-white text-xs hover:opacity-90">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={handleCSVDownload}
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] font-semibold text-sm hover:opacity-80">
          Download CSV
        </button>
      </div>
    </div>
  )
}
