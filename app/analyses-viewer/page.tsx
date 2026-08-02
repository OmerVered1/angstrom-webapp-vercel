'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import PlotlyChart from '@/components/PlotlyChart'
import { supabase, isConfigured } from '@/lib/supabase'
import { formatAlpha, parseTestDate } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Analysis } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#16a085']

type SignalMode = 'source' | 'response' | 'both'
type ParamView = 'table' | 'cards'

/** Human-readable label for an analysis, unique via #id suffix. */
function labelOf(a: Analysis): string {
  const parts = [a.model_name, a.test_date]
  if (a.temperature_c != null) parts.push(`${a.temperature_c}°C`)
  if (a.gas_atmosphere) parts.push(a.gas_atmosphere)
  parts.push(a.analysis_mode)
  return `${parts.join(' | ')} #${a.id}`
}

/** α value (raw m²/s in DB) → mm²/s string, treating ≤0 as em-dash. */
function alphaStr(v?: number | null): string {
  return v != null && v > 0 ? formatAlpha(v) : '—'
}

function numOrDash(v: number | null | undefined, digits: number): string {
  return v != null && isFinite(v) ? v.toFixed(digits) : '—'
}

// Parameter rows for the comparison table / cards.
const PARAM_ROWS: { label: string; get: (a: Analysis) => string }[] = [
  { label: 'Model', get: a => a.model_name },
  { label: 'Test date', get: a => a.test_date },
  { label: 'Test time', get: a => a.test_time ?? '—' },
  { label: 'Temperature (°C)', get: a => a.temperature_c != null ? String(a.temperature_c) : '—' },
  { label: 'Gas atmosphere', get: a => a.gas_atmosphere || '—' },
  { label: 'Power source device', get: a => a.power_source_device || '—' },
  { label: 'Power response device', get: a => a.power_response_device || '—' },
  { label: 'Wave type', get: a => a.wave_type ?? '—' },
  { label: 'Analysis mode', get: a => a.analysis_mode },
  { label: 'r₁ (mm)', get: a => numOrDash(a.r1_mm, 2) },
  { label: 'r₂ (mm)', get: a => numOrDash(a.r2_mm, 2) },
  { label: 'A₁ (mW)', get: a => numOrDash(a.amplitude_a1, 4) },
  { label: 'A₂ (mW)', get: a => numOrDash(a.amplitude_a2, 4) },
  { label: 'Src Period (s)', get: a => numOrDash(a.period_t, 2) },
  { label: 'Resp Period (s)', get: a => numOrDash(a.period_t_resp, 2) },
  { label: 'Src f (Hz)', get: a => numOrDash(a.frequency_f, 6) },
  { label: 'Resp f (Hz)', get: a => numOrDash(a.frequency_f_resp, 6) },
  { label: 'ω (rad/s)', get: a => numOrDash(a.angular_freq_w, 5) },
  { label: 'Δt (s)', get: a => numOrDash(a.raw_lag_dt, 2) },
  { label: 'φ (rad)', get: a => numOrDash(a.raw_phase_phi, 4) },
  { label: 'ln term', get: a => numOrDash(a.ln_term, 4) },
  { label: 'α Combined raw (mm²/s)', get: a => alphaStr(a.alpha_combined_raw) },
  { label: 'α Phase raw (mm²/s)', get: a => alphaStr(a.alpha_phase_raw) },
  { label: 'Calibration', get: a => a.use_calibration ? '✓' : '✗' },
  { label: 'System lag (s)', get: a => numOrDash(a.system_lag, 1) },
  { label: 'Net Δt (s)', get: a => numOrDash(a.net_lag_dt, 2) },
  { label: 'α Combined cal (mm²/s)', get: a => alphaStr(a.alpha_combined_cal) },
  { label: 'α Phase cal (mm²/s)', get: a => alphaStr(a.alpha_phase_cal) },
]

const ALPHA_SERIES = [
  { label: 'α Combined (raw)', get: (a: Analysis) => a.alpha_combined_raw > 0 ? a.alpha_combined_raw * 1e6 : null },
  { label: 'α Phase (raw)', get: (a: Analysis) => a.alpha_phase_raw > 0 ? a.alpha_phase_raw * 1e6 : null },
  { label: 'α Combined (cal)', get: (a: Analysis) => (a.alpha_combined_cal ?? 0) > 0 ? a.alpha_combined_cal! * 1e6 : null },
  { label: 'α Phase (cal)', get: (a: Analysis) => (a.alpha_phase_cal ?? 0) > 0 ? a.alpha_phase_cal! * 1e6 : null },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalysesViewerPage() {
  const { t } = useLanguage()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [signalMode, setSignalMode] = useState<SignalMode>('both')
  const [alignStart, setAlignStart] = useState(true)
  const [normalizeAmp, setNormalizeAmp] = useState(false)
  const [paramView, setParamView] = useState<ParamView>('table')

  const fetchData = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return }
    const { data, error } = await supabase.from('analyses').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      const sorted = (data as Analysis[]).sort((a, b) =>
        parseTestDate(b.test_date).getTime() - parseTestDate(a.test_date).getTime()
      )
      setAnalyses(sorted)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const selected = useMemo(
    () => analyses.filter(a => selectedIds.includes(a.id)),
    [analyses, selectedIds],
  )

  // ── Shared axis styling ─────────────────────────────────────────────────
  const axisFrame = { showline: true, linewidth: 1, linecolor: '#ccc', mirror: true, showgrid: true, gridcolor: '#eee', automargin: true }

  // ── Chart 1: Waveform overlay ───────────────────────────────────────────
  const overlay = useMemo(() => {
    const traces: Plotly.Data[] = []
    const noWaveform: string[] = []

    selected.forEach((a, i) => {
      const raw = a.graph_image ?? a.graph_json
      if (!raw || typeof raw !== 'string' || !raw.trimStart().startsWith('{')) { noWaveform.push(labelOf(a)); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsed: any
      try { parsed = JSON.parse(raw) } catch { noWaveform.push(labelOf(a)); return }
      const data = parsed?.data
      if (!Array.isArray(data)) { noWaveform.push(labelOf(a)); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wanted = data.filter((tr: any) => tr && (tr.name === 'Source' || tr.name === 'Response'))
      if (wanted.length === 0) { noWaveform.push(labelOf(a)); return }

      // Per-run start time (min x across the kept traces) for alignment.
      let x0 = Infinity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tr of wanted) {
        const xs = tr.x as number[]
        if (Array.isArray(xs)) for (const x of xs) if (typeof x === 'number' && x < x0) x0 = x
      }
      if (!isFinite(x0)) x0 = 0

      const color = COLORS[i % COLORS.length]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tr of wanted) {
        if (signalMode === 'source' && tr.name !== 'Source') continue
        if (signalMode === 'response' && tr.name !== 'Response') continue

        let xs = (tr.x as number[]) ?? []
        let ys = (tr.y as number[]) ?? []
        if (alignStart) xs = xs.map(x => x - x0)
        if (normalizeAmp) {
          let lo = Infinity, hi = -Infinity
          for (const y of ys) { if (y < lo) lo = y; if (y > hi) hi = y }
          const range = hi - lo
          ys = range > 0 ? ys.map(y => (y - lo) / range) : ys.map(() => 0)
        }

        const sigLabel = tr.name === 'Source' ? t('analysesViewer.source') : t('analysesViewer.response')
        traces.push({
          x: xs, y: ys,
          name: `${labelOf(a)} — ${sigLabel}`,
          type: 'scatter', mode: 'lines',
          line: { color, width: 2, dash: tr.name === 'Response' ? 'dash' : 'solid' },
          legendgroup: String(a.id),
          hovertemplate: '%{x}, %{y}<extra></extra>',
        } as Plotly.Data)
      }
    })

    return { traces, noWaveform }
  }, [selected, signalMode, alignStart, normalizeAmp, t])

  const overlayLayout = useMemo(() => ({
    title: `<b>${t('analysesViewer.waveformOverlay')}</b>`,
    height: 600,
    xaxis: { ...axisFrame, title: { text: alignStart ? 'Time from start (s)' : 'Time (s)', standoff: 10 } },
    yaxis: { ...axisFrame, title: { text: normalizeAmp ? 'Normalized power' : 'Power (mW)', standoff: 10 } },
    hovermode: 'closest' as const,
    legend: { orientation: 'h' as const, y: -0.18 },
    margin: { t: 50, b: 90 },
  }), [t, alignStart, normalizeAmp]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chart 2: Scalar α comparison ────────────────────────────────────────
  const alphaCompare = useMemo(() => {
    if (selected.length === 0) return null
    const labels = selected.map(labelOf)
    const data: Plotly.Data[] = ALPHA_SERIES.map((s, si) => ({
      x: labels,
      y: selected.map(a => s.get(a)),
      name: s.label,
      type: 'bar' as const,
      marker: { color: COLORS[si % COLORS.length] },
    }))
    return {
      data,
      layout: {
        title: `<b>${t('analysesViewer.resultsComparison')}</b>`,
        height: 460,
        barmode: 'group' as const,
        xaxis: { ...axisFrame, automargin: true, tickangle: -30 },
        yaxis: { ...axisFrame, title: { text: 'α (mm²/s)', standoff: 10 } },
        legend: { orientation: 'h' as const, y: -0.35 },
        margin: { t: 50, b: 140 },
      },
      config: { responsive: true },
    }
  }, [selected, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // Which parameter rows differ across the selected analyses (for highlight).
  const differingRows = useMemo(() => {
    const set = new Set<string>()
    if (selected.length < 2) return set
    for (const row of PARAM_ROWS) {
      const distinct = new Set(selected.map(a => row.get(a)))
      if (distinct.size > 1) set.add(row.label)
    }
    return set
  }, [selected])

  // ═══════════════════════════════════════════════════════════════════════

  if (!isConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{'🔬'} {t('analysesViewer.title')}</h1>
        <p className="text-[var(--text-muted)]">{t('common.supabaseNotConfigured')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4">
      <h1 className="text-3xl font-bold">{'🔬'} {t('analysesViewer.title')}</h1>

      {loading ? (
        <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
      ) : (
        <>
          {/* ── Selection ─────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <label className="block text-sm font-medium">{t('analysesViewer.selectAnalyses')}</label>
            <select
              multiple
              value={selectedIds.map(String)}
              onChange={e => setSelectedIds(Array.from(e.target.selectedOptions).map(o => Number(o.value)))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm h-48"
            >
              {analyses.map(a => <option key={a.id} value={a.id}>{labelOf(a)}</option>)}
            </select>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">{t('common.holdCtrlMultiSelect')}</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSelectedIds(analyses.map(a => a.id))}
                  className="text-xs text-[var(--accent)] hover:underline">{t('common.all')}</button>
                <button type="button" onClick={() => setSelectedIds([])}
                  className="text-xs text-[var(--accent)] hover:underline">{t('common.none')}</button>
                <span className="text-xs text-[var(--text-muted)]">{selected.length} {t('common.analysesSelected')}</span>
              </div>
            </div>
          </section>

          {selected.length === 0 ? (
            <p className="text-[var(--text-muted)]">{t('analysesViewer.selectPrompt')}</p>
          ) : (
            <>
              {/* ── Chart 1: Waveform overlay ─────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('analysesViewer.signal')}:</span>
                    {(['source', 'response', 'both'] as SignalMode[]).map(m => (
                      <label key={m} className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="signalMode" checked={signalMode === m}
                          onChange={() => setSignalMode(m)} className="accent-accent" />
                        <span className="text-sm">{t(`analysesViewer.${m}`)}</span>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={alignStart} onChange={e => setAlignStart(e.target.checked)} className="accent-accent" />
                    <span className="text-sm">{t('analysesViewer.alignToStart')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={normalizeAmp} onChange={e => setNormalizeAmp(e.target.checked)} className="accent-accent" />
                    <span className="text-sm">{t('analysesViewer.normalizeAmplitude')}</span>
                  </label>
                </div>

                {overlay.traces.length > 0 ? (
                  <PlotlyChart
                    data={overlay.traces}
                    layout={overlayLayout as Partial<Plotly.Layout>}
                    config={{ responsive: true }}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <p className="text-[var(--text-muted)] text-sm">{t('analysesViewer.noWaveformForSelection')}</p>
                )}

                {overlay.noWaveform.length > 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {t('analysesViewer.noWaveformNote')} {overlay.noWaveform.join(', ')}
                  </p>
                )}
              </section>

              {/* ── Chart 2: Scalar α comparison ──────────────────────────── */}
              {alphaCompare && (
                <section>
                  <PlotlyChart
                    data={alphaCompare.data}
                    layout={alphaCompare.layout as Partial<Plotly.Layout>}
                    config={alphaCompare.config}
                    style={{ width: '100%' }}
                  />
                </section>
              )}

              {/* ── Parameter data (table / cards) ────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="paramView" checked={paramView === 'table'}
                      onChange={() => setParamView('table')} className="accent-accent" />
                    <span className="text-sm">{t('analysesViewer.comparisonTable')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="paramView" checked={paramView === 'cards'}
                      onChange={() => setParamView('cards')} className="accent-accent" />
                    <span className="text-sm">{t('analysesViewer.cards')}</span>
                  </label>
                </div>

                {paramView === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="text-xs border border-[var(--border)] whitespace-nowrap">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)]">
                          <th className="px-2 py-2 text-start border-b border-e border-[var(--border)] sticky start-0 bg-[var(--bg-secondary)]">{t('analysesViewer.parameter')}</th>
                          {selected.map(a => (
                            <th key={a.id} className="px-2 py-2 text-start border-b border-e border-[var(--border)]">{labelOf(a)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PARAM_ROWS.map(row => {
                          const diff = differingRows.has(row.label)
                          const rowStyle = diff ? { backgroundColor: 'rgba(52,152,219,0.12)' } : undefined
                          return (
                            <tr key={row.label} style={rowStyle}>
                              <td className="px-2 py-1.5 border-b border-e border-[var(--border)] font-medium sticky start-0"
                                style={{ backgroundColor: diff ? 'rgba(52,152,219,0.12)' : 'var(--bg)' }}>{row.label}</td>
                              {selected.map(a => (
                                <td key={a.id} className="px-2 py-1.5 border-b border-e border-[var(--border)]">{row.get(a)}</td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selected.map(a => (
                      <div key={a.id} className="rounded-lg border border-[var(--border)] p-3 space-y-1">
                        <p className="text-sm font-semibold mb-2">{labelOf(a)}</p>
                        <table className="w-full text-xs">
                          <tbody>
                            {PARAM_ROWS.map(row => (
                              <tr key={row.label}>
                                <td className="py-0.5 pe-3 text-[var(--text-muted)]">{row.label}</td>
                                <td className="py-0.5 text-end">{row.get(a)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
