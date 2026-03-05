'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { formatAlpha, parseTestDate } from '@/lib/utils'
import { dbDelete } from '@/lib/dbClient'
import PlotlyChart from '@/components/PlotlyChart'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Analysis } from '@/lib/types'

function safe(v: unknown, decimals = 4): string {
  if (v == null || v === 0) return '\u2014'
  return Number(v).toFixed(decimals)
}

/** Try to parse stored Plotly JSON and render it */
function StoredGraph({ graphJson }: { graphJson: string }) {
  try {
    const parsed = JSON.parse(graphJson)
    const data = parsed.data as Plotly.Data[] | undefined
    const layout = parsed.layout as Partial<Plotly.Layout> | undefined
    if (!data || !Array.isArray(data)) return null
    return (
      <PlotlyChart
        data={data}
        layout={{ ...layout, height: layout?.height ?? 450, autosize: true } as Partial<Plotly.Layout>}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    )
  } catch {
    return null
  }
}

/** Fallback bar chart when no stored graph */
function AlphaBarChart({ selected }: { selected: Analysis }) {
  const labels: string[] = []
  const values: number[] = []
  const colors: string[] = []
  if (selected.alpha_combined_raw > 0) {
    labels.push('\u03B1 comb (raw)'); values.push(selected.alpha_combined_raw * 1e6); colors.push('#3498db')
  }
  if (selected.alpha_phase_raw > 0) {
    labels.push('\u03B1 phase (raw)'); values.push(selected.alpha_phase_raw * 1e6); colors.push('#e74c3c')
  }
  if (selected.use_calibration && (selected.alpha_combined_cal ?? 0) > 0) {
    labels.push('\u03B1 comb (cal)'); values.push(selected.alpha_combined_cal! * 1e6); colors.push('#2ecc71')
  }
  if (selected.use_calibration && (selected.alpha_phase_cal ?? 0) > 0) {
    labels.push('\u03B1 phase (cal)'); values.push(selected.alpha_phase_cal! * 1e6); colors.push('#f39c12')
  }
  if (labels.length === 0) return null
  return (
    <PlotlyChart
      data={[{
        x: labels, y: values, type: 'bar' as const,
        marker: { color: colors },
        text: values.map(v => v.toPrecision(4)),
        textposition: 'outside' as const,
      }] as Plotly.Data[]}
      layout={{
        title: { text: 'Thermal Diffusivity \u03B1' },
        height: 300,
        yaxis: { title: '\u03B1 (mm\u00B2/s)' },
        margin: { t: 40, b: 60, l: 60, r: 20 },
      } as Partial<Plotly.Layout>}
      config={{ responsive: true }}
      style={{ width: '100%' }}
    />
  )
}

export default function HistoryPage() {
  const { t } = useLanguage()
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
      setMsg(t('history.deleteFailed') + error)
    } else {
      setMsg(t('history.deleted'))
      setSelectedId(null)
      await fetchData()
    }
    setDeleting(false)
  }

  const dropdownLabel = (a: Analysis) => {
    const cal = a.use_calibration ? `${t('history.calLag')} ${a.system_lag ?? 0}s)` : t('history.noCal')
    return `${a.model_name} | ${a.test_date} | ${a.analysis_mode} | ${cal}`
  }

  if (!isConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{'\uD83D\uDCC1'} {t('history.title')}</h1>
        <p className="text-[var(--text-muted)]">{t('common.supabaseNotConfigured')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCC1'} {t('history.title')}</h1>

      {loading ? (
        <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
      ) : analyses.length === 0 ? (
        <p className="text-[var(--text-muted)]">{t('common.noData')}</p>
      ) : (
        <>
          {/* Overview table */}
          <h2 className="text-lg font-bold">{t('history.allAnalyses')} ({analyses.length} {t('history.total')})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  {['ID', t('history.model'), t('history.testDate'), 'Mode', 'r\u2081', 'r\u2082', '\u03B1 comb (raw)', '\u03B1 phase (raw)', 'Cal', 'T (\u00B0C)'].map(h => (
                    <th key={h} className="px-3 py-2 text-start border-b border-[var(--border)] font-semibold text-xs">{h}</th>
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

          <hr className="border-[var(--border)]" />

          {/* Detail view */}
          {selected && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{t('history.viewDetails')}</h2>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('history.selectAnalysis')}</label>
                <select value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  {analyses.map(a => (
                    <option key={a.id} value={a.id}>{dropdownLabel(a)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[2fr_1fr] gap-6">
                {/* Left: Full Details */}
                <div className="space-y-2">
                  <p className="font-semibold text-sm">{t('history.fullDetails')}</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {([
                        [t('history.created'), selected.created_at ? new Date(selected.created_at).toLocaleString() : '\u2014'],
                        [t('history.model'), selected.model_name],
                        [t('history.testDate'), selected.test_date],
                        [t('history.radii'), `r\u2081=${selected.r1_mm}mm, r\u2082=${selected.r2_mm}mm`],
                        [t('history.temperature'), `${selected.temperature_c ?? 25}\u00B0C`],
                        [t('history.periodT'), `${safe(selected.period_t, 2)}s`],
                        [t('history.frequency'), `${safe(selected.frequency_f, 5)}Hz`],
                        [t('history.rawDt'), `${safe(selected.raw_lag_dt, 2)}s`],
                        ['\u03B1 Combined (raw)', `${formatAlpha(selected.alpha_combined_raw)} mm\u00B2/s`],
                        ['\u03B1 Phase (raw)', `${formatAlpha(selected.alpha_phase_raw)} mm\u00B2/s`],
                        ...(selected.use_calibration ? [
                          [t('history.systemLag'), `${safe(selected.system_lag, 1)}s`],
                          [t('history.netDt'), `${safe(selected.net_lag_dt, 2)}s`],
                          ['\u03B1 Combined (cal)', `${formatAlpha(selected.alpha_combined_cal ?? null)} mm\u00B2/s`],
                          ['\u03B1 Phase (cal)', `${formatAlpha(selected.alpha_phase_cal ?? null)} mm\u00B2/s`],
                        ] : []),
                      ] as [string, string][]).map(([k, v]) => (
                        <tr key={k}>
                          <td className="py-1 pe-4 text-[var(--text-muted)] font-medium">{k}</td>
                          <td className="py-1">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: Graph + Delete */}
                <div className="space-y-4">
                  {/* Render stored graph or fallback */}
                  {(() => {
                    const gj = selected.graph_image || selected.graph_json
                    if (gj && typeof gj === 'string' && gj.length > 10) {
                      // Base64 image (JPEG or PNG)
                      if (gj.startsWith('/9j/') || gj.startsWith('iVBOR')) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`data:image/${gj.startsWith('/9j/') ? 'jpeg' : 'png'};base64,${gj}`}
                            alt="Original Result Image"
                            className="w-full rounded-lg border border-[var(--border)]"
                          />
                        )
                      }
                      // Plotly JSON
                      if (gj.startsWith('{')) {
                        const rendered = <StoredGraph graphJson={gj} />
                        if (rendered) return rendered
                      }
                    }
                    // Fallback: summary bar chart
                    return <AlphaBarChart selected={selected} />
                  })()}

                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full px-5 py-2.5 rounded-lg bg-danger text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                    {deleting ? t('history.deleting') : `\uD83D\uDDD1\uFE0F ${t('history.deleteResult')}`}
                  </button>

                  {msg && (
                    <p className={`text-sm font-medium ${msg.includes(t('history.deleted')) ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
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
