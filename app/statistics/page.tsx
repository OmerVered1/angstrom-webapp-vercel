'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import PlotlyChart from '@/components/PlotlyChart'
import { supabase, isConfigured } from '@/lib/supabase'
import { formatAlpha, parseTestDate } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Analysis } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#16a085']

const LITERATURE: Record<string, { alpha: number; color: string }> = {
  Abs: { alpha: 0.08, color: '#c0392b' },
  Al: { alpha: 64.0, color: '#d68910' },
  Brass: { alpha: 34.1, color: '#b7950b' },
  'Stainless Steel': { alpha: 4.0, color: '#717d7e' },
}

type YMetric = {
  key: string
  label: string
  extract: (a: Analysis) => number | null
  isAlpha?: boolean
}

const Y_METRICS: YMetric[] = [
  { key: 'alpha_combined_raw', label: '\u03B1 Combined (raw) mm\u00B2/s', extract: a => a.alpha_combined_raw > 0 ? a.alpha_combined_raw * 1e6 : null, isAlpha: true },
  { key: 'alpha_phase_raw', label: '\u03B1 Phase (raw) mm\u00B2/s', extract: a => a.alpha_phase_raw > 0 ? a.alpha_phase_raw * 1e6 : null, isAlpha: true },
  { key: 'alpha_combined_cal', label: '\u03B1 Combined (cal) mm\u00B2/s', extract: a => (a.alpha_combined_cal ?? 0) > 0 ? a.alpha_combined_cal! * 1e6 : null, isAlpha: true },
  { key: 'alpha_phase_cal', label: '\u03B1 Phase (cal) mm\u00B2/s', extract: a => (a.alpha_phase_cal ?? 0) > 0 ? a.alpha_phase_cal! * 1e6 : null, isAlpha: true },
  { key: 'raw_lag_dt', label: 'Raw Time Lag \u0394t (s)', extract: a => a.raw_lag_dt },
  { key: 'raw_phase_phi', label: 'Raw Phase \u03C6 (rad)', extract: a => a.raw_phase_phi },
  { key: 'ln_term', label: 'ln term', extract: a => a.ln_term },
  { key: 'amplitude_a1', label: 'A\u2081 (mW)', extract: a => a.amplitude_a1 },
  { key: 'amplitude_a2', label: 'A\u2082 (mW)', extract: a => a.amplitude_a2 },
  { key: 'a1_a2_ratio', label: 'A\u2081/A\u2082 ratio', extract: a => a.amplitude_a2 !== 0 ? a.amplitude_a1 / a.amplitude_a2 : null },
  { key: 'period_t', label: 'Period (s)', extract: a => a.period_t },
  { key: 'temperature_c', label: 'Temperature (\u00B0C)', extract: a => a.temperature_c ?? null },
]

const GROUP_OPTIONS = ['Model', 'Model + Period', 'Period (exact)', 'Period Band', 'Temp Band', 'Calibration', 'Analysis Mode']
const X_OPTIONS = ['Period (s)', 'Frequency (Hz)', 'Temperature (\u00B0C)', 'Raw \u0394t (s)', 'ln term', 'A\u2081/A\u2082 ratio', 'System Lag (s)', 'A\u2081 (mW)', 'A\u2082 (mW)']

const ALPHA_SERIES = [
  { key: 'combined_raw', label: '\u03B1 Combined (raw)', extract: (a: Analysis) => a.alpha_combined_raw > 0 ? a.alpha_combined_raw * 1e6 : null },
  { key: 'phase_raw', label: '\u03B1 Phase (raw)', extract: (a: Analysis) => a.alpha_phase_raw > 0 ? a.alpha_phase_raw * 1e6 : null },
  { key: 'combined_cal', label: '\u03B1 Combined (cal)', extract: (a: Analysis) => (a.alpha_combined_cal ?? 0) > 0 ? a.alpha_combined_cal! * 1e6 : null },
  { key: 'phase_cal', label: '\u03B1 Phase (cal)', extract: (a: Analysis) => (a.alpha_phase_cal ?? 0) > 0 ? a.alpha_phase_cal! * 1e6 : null },
] as const

function periodBand(p: number): string {
  if (p < 200) return '< 200 s'
  if (p < 400) return '200\u2013400 s'
  if (p < 700) return '400\u2013700 s'
  if (p < 1200) return '700\u20131200 s'
  return '> 1200 s'
}

function tempBand(t: number): string {
  if (t < 50) return '< 50 \u00B0C'
  if (t < 100) return '50\u2013100 \u00B0C'
  if (t < 200) return '100\u2013200 \u00B0C'
  if (t < 300) return '200\u2013300 \u00B0C'
  return '> 300 \u00B0C'
}

function groupValue(a: Analysis, groupBy: string): string {
  switch (groupBy) {
    case 'Model': return a.model_name
    case 'Model + Period': return `${a.model_name} | ${Math.round(a.period_t / 10) * 10}s`
    case 'Period (exact)': return `${Math.round(a.period_t / 10) * 10} s`
    case 'Period Band': return periodBand(a.period_t)
    case 'Temp Band': return tempBand(a.temperature_c ?? 25)
    case 'Calibration': return a.use_calibration ? 'Calibrated' : 'Uncalibrated'
    case 'Analysis Mode': return a.analysis_mode
    default: return a.model_name
  }
}

function xValue(a: Analysis, xKey: string): number | null {
  switch (xKey) {
    case 'Period (s)': return a.period_t
    case 'Frequency (Hz)': return a.frequency_f
    case 'Temperature (\u00B0C)': return a.temperature_c ?? null
    case 'Raw \u0394t (s)': return a.raw_lag_dt
    case 'ln term': return a.ln_term
    case 'A\u2081/A\u2082 ratio': return a.amplitude_a2 !== 0 ? a.amplitude_a1 / a.amplitude_a2 : null
    case 'System Lag (s)': return a.system_lag ?? null
    case 'A\u2081 (mW)': return a.amplitude_a1
    case 'A\u2082 (mW)': return a.amplitude_a2
    default: return null
  }
}

function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length
  if (n < 3) return null
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return { slope: (n * sxy - sx * sy) / denom, intercept: (sy * sxx - sx * sxy) / denom }
}

function mean(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) / arr.length }
function std(arr: number[]): number {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatisticsPage() {
  const { t } = useLanguage()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  // Chart builder controls
  const [yMetric, setYMetric] = useState(Y_METRICS[0].key)
  const [chartType, setChartType] = useState<'box' | 'violin' | 'bar' | 'scatter' | 'line'>('box')
  const [groupBy, setGroupBy] = useState('Model')
  const [xAxis, setXAxis] = useState('Period (s)')
  const [colorBy, setColorBy] = useState('None')
  const [showLit, setShowLit] = useState(false)
  const [logY, setLogY] = useState(false)
  const [logX, setLogX] = useState(false)

  // Filters
  const [filterModels, setFilterModels] = useState<string[]>([])
  const [filterCal, setFilterCal] = useState<'All' | 'Calibrated' | 'Uncalibrated'>('All')
  const [filterPeriods, setFilterPeriods] = useState<string[]>([])

  // Alpha vs Period series selector
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['combined_raw'])
  const [showLitAlpha, setShowLitAlpha] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return }
    const { data, error } = await supabase.from('analyses').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      setAnalyses(data as Analysis[])
      setFilterModels(Array.from(new Set((data as Analysis[]).map(a => a.model_name))))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const allModels = useMemo(() => Array.from(new Set(analyses.map(a => a.model_name))), [analyses])
  const allPeriods = useMemo(() => Array.from(new Set(analyses.map(a => Math.round(a.period_t / 10) * 10 + ' s'))).sort(), [analyses])

  const filtered = useMemo(() => {
    return analyses.filter(a => {
      if (filterModels.length > 0 && !filterModels.includes(a.model_name)) return false
      if (filterCal === 'Calibrated' && !a.use_calibration) return false
      if (filterCal === 'Uncalibrated' && a.use_calibration) return false
      if (filterPeriods.length > 0 && !filterPeriods.includes(Math.round(a.period_t / 10) * 10 + ' s')) return false
      return true
    })
  }, [analyses, filterModels, filterCal, filterPeriods])

  const yMeta = Y_METRICS.find(m => m.key === yMetric)!

  // ── Build chart ─────────────────────────────────────────────────────────

  const chartBuilderPlot = useMemo(() => {
    if (filtered.length === 0) return null

    const litShapes = (showLit && yMeta.isAlpha) ? Object.entries(LITERATURE).map(([name, { alpha, color }]) => ({
      type: 'line' as const, x0: 0, x1: 1, xref: 'paper' as const,
      y0: alpha, y1: alpha,
      line: { color, dash: 'dash' as const, width: 1.5 },
    })) : []

    const litAnnotations = (showLit && yMeta.isAlpha) ? Object.entries(LITERATURE).map(([name, { alpha, color }]) => ({
      x: 1, xref: 'paper' as const, y: alpha, text: name,
      showarrow: false, xanchor: 'left' as const, font: { color, size: 10 },
    })) : []

    if (chartType === 'scatter' || chartType === 'line') {
      // Scatter / Line with optional color grouping
      const groups = colorBy !== 'None'
        ? Array.from(new Set(filtered.map(a => groupValue(a, colorBy))))
        : ['All']

      const traces: Plotly.Data[] = groups.map((grp, gi) => {
        const subset = colorBy !== 'None' ? filtered.filter(a => groupValue(a, colorBy) === grp) : filtered
        const points: { x: number; y: number; text: string }[] = []
        for (const a of subset) {
          const xv = xValue(a, xAxis)
          const yv = yMeta.extract(a)
          if (xv != null && yv != null) {
            points.push({ x: xv, y: yv, text: `${a.model_name} | ${Math.round(a.period_t / 10) * 10}s | ${a.test_date}` })
          }
        }
        // Sort by x for line plots
        if (chartType === 'line') points.sort((a, b) => a.x - b.x)
        return {
          x: points.map(p => p.x), y: points.map(p => p.y), text: points.map(p => p.text),
          name: grp, type: 'scatter' as const,
          mode: chartType === 'line' ? 'lines+markers' as const : 'markers' as const,
          marker: { color: COLORS[gi % COLORS.length], size: chartType === 'line' ? 6 : 8 },
          line: chartType === 'line' ? { color: COLORS[gi % COLORS.length], width: 2 } : undefined,
          hovertemplate: '%{text}<br>x: %{x}<br>y: %{y}<extra></extra>',
        }
      })

      // Trend lines (scatter only)
      const trendTraces: Plotly.Data[] = []
      if (chartType === 'scatter') {
        for (let gi = 0; gi < groups.length; gi++) {
          const trace = traces[gi] as { x: number[]; y: number[] }
          const fit = linearFit(trace.x, trace.y)
          if (fit) {
            const xSorted = [...trace.x].sort((a, b) => a - b)
            trendTraces.push({
              x: [xSorted[0], xSorted[xSorted.length - 1]],
              y: [fit.slope * xSorted[0] + fit.intercept, fit.slope * xSorted[xSorted.length - 1] + fit.intercept],
              name: `Trend (${groups[gi]})`, type: 'scatter' as const, mode: 'lines' as const,
              line: { color: COLORS[gi % COLORS.length], dash: 'dot' as const, width: 1.5 },
              showlegend: false,
            })
          }
        }
      }

      return {
        data: [...traces, ...trendTraces],
        layout: {
          title: `${yMeta.label} vs ${xAxis}`,
          height: 500,
          xaxis: { title: { text: xAxis, standoff: 10 }, automargin: true, type: logX ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
          yaxis: { title: { text: yMeta.label, standoff: 10 }, automargin: true, type: logY ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
          hovermode: 'closest' as const,
          shapes: litShapes,
          annotations: litAnnotations,
          legend: { orientation: 'h' as const, y: -0.2 },
          margin: { t: 50, b: 80 },
        },
        config: { responsive: true },
      }
    }

    // Box / Violin / Bar
    const groups = Array.from(new Set(filtered.map(a => groupValue(a, groupBy))))
    const traces: Plotly.Data[] = groups.map((grp, gi) => {
      const subset = filtered.filter(a => groupValue(a, groupBy) === grp)
      const vals = subset.map(a => yMeta.extract(a)).filter((v): v is number => v != null)

      if (chartType === 'bar') {
        return {
          x: [grp], y: [vals.length ? mean(vals) : 0],
          error_y: { type: 'data' as const, array: [vals.length > 1 ? std(vals) : 0], visible: true },
          name: grp, type: 'bar' as const,
          marker: { color: COLORS[gi % COLORS.length] },
        }
      }

      return {
        y: vals, name: grp,
        type: chartType as 'box' | 'violin',
        marker: { color: COLORS[gi % COLORS.length] },
        ...(chartType === 'box' ? { boxpoints: 'all' as const, jitter: 0.3 } : {}),
        ...(chartType === 'violin' ? { points: 'all' as const } : {}),
      }
    })

    return {
      data: traces,
      layout: {
        title: `${yMeta.label} by ${groupBy}`,
        height: 500,
        xaxis: { title: { text: groupBy, standoff: 10 }, automargin: true, type: logX ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
        yaxis: { title: { text: yMeta.label, standoff: 10 }, automargin: true, type: logY ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
        shapes: litShapes,
        annotations: litAnnotations,
        legend: { orientation: 'h' as const, y: -0.2 },
        margin: { t: 50, b: 80 },
      },
      config: { responsive: true },
    }
  }, [filtered, yMetric, chartType, groupBy, xAxis, colorBy, showLit, yMeta, logY, logX])

  // ── Alpha vs Period by Model ──────────────────────────────────────────

  const alphaVsPeriodPlot = useMemo(() => {
    if (filtered.length === 0 || selectedSeries.length === 0) return null
    const models = Array.from(new Set(filtered.map(a => a.model_name)))
    const activeSeries = ALPHA_SERIES.filter(s => selectedSeries.includes(s.key))
    const DASH_STYLES: ('solid' | 'dash' | 'dot' | 'dashdot')[] = ['solid', 'dash', 'dot', 'dashdot']
    const traces: Plotly.Data[] = []

    models.forEach((model, mi) => {
      activeSeries.forEach((series, si) => {
        const subset = filtered.filter(a => a.model_name === model)
        const xs: number[] = []
        const ys: number[] = []
        for (const a of subset) {
          const v = series.extract(a)
          if (v != null) { xs.push(a.period_t); ys.push(v) }
        }
        if (xs.length === 0) return
        traces.push({
          x: xs,
          y: ys,
          name: activeSeries.length > 1 ? `${model} (${series.label})` : model,
          type: 'scatter' as const, mode: 'lines+markers' as const,
          marker: { color: COLORS[mi % COLORS.length], size: 7, symbol: si },
          line: { color: COLORS[mi % COLORS.length], width: 1, dash: DASH_STYLES[si % DASH_STYLES.length] },
          legendgroup: model,
        })
      })
    })

    const seriesLabels = activeSeries.map(s => s.label).join(', ')

    const litShapes = showLitAlpha ? Object.entries(LITERATURE).map(([, { alpha, color }]) => ({
      type: 'line' as const, x0: 0, x1: 1, xref: 'paper' as const,
      y0: alpha, y1: alpha,
      line: { color, dash: 'dash' as const, width: 1.5 },
    })) : []

    const litAnn = showLitAlpha ? Object.entries(LITERATURE).map(([name, { alpha, color }]) => ({
      x: 1, xref: 'paper' as const, y: alpha, text: name,
      showarrow: false, xanchor: 'left' as const, font: { color, size: 10 },
    })) : []

    return {
      data: traces,
      layout: {
        title: `${seriesLabels} vs Period \u2014 by Model`,
        height: 420,
        xaxis: { title: { text: 'Period (s)', standoff: 10 }, automargin: true, type: logX ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
        yaxis: { title: { text: '\u03B1 (mm\u00B2/s)', standoff: 10 }, automargin: true, type: logY ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
        shapes: litShapes,
        annotations: litAnn,
        legend: { orientation: 'h' as const, y: -0.2 },
        margin: { t: 50, b: 80 },
      },
      config: { responsive: true },
    }
  }, [filtered, selectedSeries, showLitAlpha, logY, logX])

  // ── Heat-loss indicators ──────────────────────────────────────────────

  const heatLossPlots = useMemo(() => {
    if (filtered.length === 0) return []
    const models = Array.from(new Set(filtered.map(a => a.model_name)))

    const makePlot = (title: string, yLabel: string, extract: (a: Analysis) => number | null, refLine?: number) => {
      const traces: Plotly.Data[] = models.map((m, mi) => {
        const vals = filtered.filter(a => a.model_name === m).map(a => extract(a)).filter((v): v is number => v != null)
        return { y: vals, name: m, type: 'box' as const, boxpoints: 'all' as const, jitter: 0.3, marker: { color: COLORS[mi % COLORS.length] } }
      })
      return {
        data: traces,
        layout: {
          title, height: 350,
          xaxis: { title: { text: 'Model', standoff: 10 }, automargin: true, type: logX ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
          yaxis: { title: { text: yLabel, standoff: 10 }, automargin: true, type: logY ? 'log' as const : 'linear' as const, exponentformat: 'none' as const },
          shapes: refLine != null ? [{
            type: 'line' as const, x0: 0, x1: 1, xref: 'paper' as const,
            y0: refLine, y1: refLine,
            line: { color: '#888', dash: 'dash' as const, width: 1 },
          }] : [],
          annotations: refLine != null ? [{
            x: 1, xref: 'paper' as const, y: refLine, text: 'Ideal', showarrow: false,
            font: { color: '#888', size: 10 },
          }] : [],
          margin: { t: 40, b: 50 },
          showlegend: false,
        },
        config: { responsive: true },
      }
    }

    return [
      makePlot('ln term by Model', 'ln(A\u2081\u221Ar\u2081 / A\u2082\u221Ar\u2082)', a => a.ln_term),
      makePlot('A\u2081/A\u2082 Ratio by Model', 'A\u2081/A\u2082', a => a.amplitude_a2 !== 0 ? a.amplitude_a1 / a.amplitude_a2 : null),
      makePlot('\u03B1 phase/\u03B1 comb by Model', '\u03B1 phase / \u03B1 combined', a => a.alpha_combined_raw > 0 && a.alpha_phase_raw > 0 ? a.alpha_phase_raw / a.alpha_combined_raw : null, 1),
    ]
  }, [filtered, logY, logX])

  // ── Phase lag analysis ────────────────────────────────────────────────

  const phaseLagPlots = useMemo(() => {
    if (filtered.length === 0) return []
    const models = Array.from(new Set(filtered.map(a => a.model_name)))

    const makePlot = (title: string, yExtract: (a: Analysis) => number, yLabel: string) => {
      const traces: Plotly.Data[] = models.map((m, mi) => {
        const subset = filtered.filter(a => a.model_name === m).sort((a, b) => a.period_t - b.period_t)
        return {
          x: subset.map(a => a.period_t), y: subset.map(a => yExtract(a)),
          name: m, type: 'scatter' as const, mode: 'lines+markers' as const,
          marker: { color: COLORS[mi % COLORS.length], size: 6 },
          line: { color: COLORS[mi % COLORS.length], width: 1 },
        }
      })
      return {
        data: traces,
        layout: { title, height: 350, xaxis: { title: { text: 'Period (s)', standoff: 10 }, automargin: true, type: logX ? 'log' as const : 'linear' as const, exponentformat: 'none' as const }, yaxis: { title: { text: yLabel, standoff: 10 }, automargin: true, type: logY ? 'log' as const : 'linear' as const, exponentformat: 'none' as const }, margin: { t: 40, b: 50 }, legend: { orientation: 'h' as const, y: -0.25 } },
        config: { responsive: true },
      }
    }

    return [
      makePlot('Raw Phase \u03C6 vs Period', a => a.raw_phase_phi, '\u03C6 (rad)'),
      makePlot('Raw Time Lag \u0394t vs Period', a => a.raw_lag_dt, '\u0394t (s)'),
    ]
  }, [filtered, logY, logX])

  // ── Temperature dependence ────────────────────────────────────────────

  const tempPlots = useMemo(() => {
    const withTemp = filtered.filter(a => a.temperature_c != null)
    const uniqueTemps = new Set(withTemp.map(a => a.temperature_c))
    if (uniqueTemps.size < 2) return []

    const models = Array.from(new Set(withTemp.map(a => a.model_name)))
    const makePlot = (title: string, extract: (a: Analysis) => number | null) => {
      const traces: Plotly.Data[] = models.map((m, mi) => {
        const subset = withTemp.filter(a => a.model_name === m).sort((a, b) => (a.temperature_c ?? 0) - (b.temperature_c ?? 0))
        const xs: number[] = [], ys: number[] = []
        for (const a of subset) {
          const y = extract(a)
          if (y != null) { xs.push(a.temperature_c!); ys.push(y) }
        }
        return {
          x: xs, y: ys, name: m, type: 'scatter' as const, mode: 'lines+markers' as const,
          marker: { color: COLORS[mi % COLORS.length], size: 7 },
          line: { color: COLORS[mi % COLORS.length], width: 1 },
        }
      })
      return {
        data: traces,
        layout: {
          title, height: 400,
          xaxis: { title: 'Temperature (\u00B0C)' },
          yaxis: { title: '\u03B1 (mm\u00B2/s)' },
          shapes: Object.entries(LITERATURE).map(([, { alpha, color }]) => ({
            type: 'line' as const, x0: 0, x1: 1, xref: 'paper' as const, y0: alpha, y1: alpha,
            line: { color, dash: 'dash' as const, width: 1.5 },
          })),
          legend: { orientation: 'h' as const, y: -0.2 },
          margin: { t: 50, b: 80 },
        },
        config: { responsive: true },
      }
    }

    return [
      makePlot('\u03B1 Combined (raw) vs Temperature', a => a.alpha_combined_raw > 0 ? a.alpha_combined_raw * 1e6 : null),
      makePlot('\u03B1 Phase (raw) vs Temperature', a => a.alpha_phase_raw > 0 ? a.alpha_phase_raw * 1e6 : null),
    ]
  }, [filtered])

  // ── Correlation matrix ────────────────────────────────────────────────

  const corrPlot = useMemo(() => {
    if (filtered.length < 3) return null

    const cols: { label: string; extract: (a: Analysis) => number | null }[] = [
      { label: 'A\u2081', extract: a => a.amplitude_a1 },
      { label: 'A\u2082', extract: a => a.amplitude_a2 },
      { label: 'A\u2081/A\u2082', extract: a => a.amplitude_a2 !== 0 ? a.amplitude_a1 / a.amplitude_a2 : null },
      { label: 'Period', extract: a => a.period_t },
      { label: '\u0394t', extract: a => a.raw_lag_dt },
      { label: '\u03C6', extract: a => a.raw_phase_phi },
      { label: 'ln term', extract: a => a.ln_term },
      { label: '\u03B1 comb raw', extract: a => a.alpha_combined_raw > 0 ? a.alpha_combined_raw * 1e6 : null },
      { label: '\u03B1 phase raw', extract: a => a.alpha_phase_raw > 0 ? a.alpha_phase_raw * 1e6 : null },
      { label: 'T (\u00B0C)', extract: a => a.temperature_c ?? null },
    ]

    // Build matrix
    const n = cols.length
    const vectors: (number | null)[][] = cols.map(c => filtered.map(a => c.extract(a)))
    const matrix: number[][] = []

    for (let i = 0; i < n; i++) {
      const row: number[] = []
      for (let j = 0; j < n; j++) {
        const pairs: [number, number][] = []
        for (let k = 0; k < filtered.length; k++) {
          const a = vectors[i][k], b = vectors[j][k]
          if (a != null && b != null) pairs.push([a, b])
        }
        if (pairs.length < 3) { row.push(0); continue }
        const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1])
        const mx = mean(xs), my = mean(ys)
        const num = xs.reduce((s, x, idx) => s + (x - mx) * (ys[idx] - my), 0)
        const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0))
        const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0))
        row.push(dx * dy === 0 ? 0 : num / (dx * dy))
      }
      matrix.push(row)
    }

    const labels = cols.map(c => c.label)
    // Format values for display
    const textMatrix = matrix.map(row => row.map(v => v.toFixed(2)))

    return {
      data: [{
        z: matrix, x: labels, y: labels,
        type: 'heatmap' as const,
        colorscale: 'RdBu' as const,
        zmid: 0, zmin: -1, zmax: 1,
        text: textMatrix,
        hovertemplate: '%{y} vs %{x}: %{text}<extra></extra>',
      }],
      layout: {
        title: 'Correlation Matrix (Pearson r)',
        height: 500, width: 600,
        margin: { t: 50, l: 100, b: 100 },
      },
      config: { responsive: true },
    }
  }, [filtered])

  // ── Summary stats by model ────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const models = Array.from(new Set(filtered.map(a => a.model_name)))
    return models.map(model => {
      const subset = filtered.filter(a => a.model_name === model)
      const combRaw = subset.filter(a => a.alpha_combined_raw > 0).map(a => a.alpha_combined_raw * 1e6)
      const phaseRaw = subset.filter(a => a.alpha_phase_raw > 0).map(a => a.alpha_phase_raw * 1e6)
      const combCal = subset.filter(a => (a.alpha_combined_cal ?? 0) > 0).map(a => a.alpha_combined_cal! * 1e6)
      const phaseCal = subset.filter(a => (a.alpha_phase_cal ?? 0) > 0).map(a => a.alpha_phase_cal! * 1e6)

      const s = (arr: number[]) => arr.length > 0
        ? { n: arr.length, mean: mean(arr).toPrecision(4), std: std(arr).toPrecision(3), min: Math.min(...arr).toPrecision(4), max: Math.max(...arr).toPrecision(4) }
        : { n: 0, mean: '\u2014', std: '\u2014', min: '\u2014', max: '\u2014' }

      return { model, n: subset.length, combRaw: s(combRaw), phaseRaw: s(phaseRaw), combCal: s(combCal), phaseCal: s(phaseCal) }
    })
  }, [filtered])

  // ── CSV download helper ─────────────────────────────────────────────────

  const downloadStatsCsv = useCallback(() => {
    const headers = [
      'Model', 'N',
      'alpha_comb_raw_mean', 'alpha_comb_raw_std', 'alpha_comb_raw_min', 'alpha_comb_raw_max',
      'alpha_phase_raw_mean', 'alpha_phase_raw_std', 'alpha_phase_raw_min', 'alpha_phase_raw_max',
      'alpha_comb_cal_mean', 'alpha_comb_cal_std', 'alpha_comb_cal_min', 'alpha_comb_cal_max',
      'alpha_phase_cal_mean', 'alpha_phase_cal_std', 'alpha_phase_cal_min', 'alpha_phase_cal_max',
    ]
    const rows = summaryStats.map(s => [
      s.model, s.n,
      s.combRaw.mean, s.combRaw.std, s.combRaw.min, s.combRaw.max,
      s.phaseRaw.mean, s.phaseRaw.std, s.phaseRaw.min, s.phaseRaw.max,
      s.combCal.mean, s.combCal.std, s.combCal.min, s.combCal.max,
      s.phaseCal.mean, s.phaseCal.std, s.phaseCal.min, s.phaseCal.max,
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'summary_statistics.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [summaryStats])

  // ═══════════════════════════════════════════════════════════════════════════

  if (!isConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{'\uD83D\uDCC8'} {t('statistics.title')}</h1>
        <p className="text-[var(--text-muted)]">{t('common.supabaseNotConfigured')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCC8'} {t('statistics.title')}</h1>

      {loading ? <p className="text-[var(--text-muted)]">{t('common.loading')}</p> : filtered.length === 0 ? (
        <p className="text-[var(--text-muted)]">{t('statistics.noDataRunFirst')}</p>
      ) : (
        <>
          {/* ── Filters ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.models')}</label>
              <select multiple value={filterModels} onChange={e => setFilterModels(Array.from(e.target.selectedOptions).map(o => o.value))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm h-20">
                {allModels.map(m => <option key={m}>{m}</option>)}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('common.holdCtrlMultiSelect')}</p>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.calibration')}</label>
              <select value={filterCal} onChange={e => setFilterCal(e.target.value as typeof filterCal)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                <option value="All">{t('common.all')}</option><option value="Calibrated">{t('statistics.calibrated')}</option><option value="Uncalibrated">{t('statistics.uncalibrated')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.periods')}</label>
              <select multiple value={filterPeriods} onChange={e => setFilterPeriods(Array.from(e.target.selectedOptions).map(o => o.value))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm h-20">
                {allPeriods.map(p => <option key={p}>{p}</option>)}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('common.holdCtrlMultiSelect')}</p>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-[var(--text-muted)]">{filtered.length} {t('common.analysesSelected')}</p>
            </div>
          </div>

          {/* ── Section 1: Chart Builder ──────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('statistics.chartBuilder')}</h2>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.yAxisMetric')}</label>
                <select value={yMetric} onChange={e => setYMetric(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  {Y_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.chartType')}</label>
                <select value={chartType} onChange={e => setChartType(e.target.value as typeof chartType)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option value="box">{t('statistics.box')}</option><option value="violin">{t('statistics.violin')}</option>
                  <option value="bar">{t('statistics.barMeanStd')}</option><option value="scatter">{t('statistics.scatter')}</option>
                  <option value="line">{t('statistics.line')}</option>
                </select>
              </div>
              {(chartType === 'scatter' || chartType === 'line') ? (
                <>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.xAxis')}</label>
                    <select value={xAxis} onChange={e => setXAxis(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                      {X_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.colorBy')}</label>
                    <select value={colorBy} onChange={e => setColorBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                      <option value="None">{t('common.none')}</option>
                      {GROUP_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">{t('statistics.groupBy')}</label>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                      {GROUP_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div />
                </>
              )}
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showLit} onChange={e => setShowLit(e.target.checked)} className="accent-accent" />
                <span className="text-sm">{t('statistics.showLitRef')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={logX} onChange={e => setLogX(e.target.checked)} className="accent-accent" />
                <span className="text-sm">Log X-axis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={logY} onChange={e => setLogY(e.target.checked)} className="accent-accent" />
                <span className="text-sm">Log Y-axis</span>
              </label>
            </div>
            {chartBuilderPlot && (
              <PlotlyChart
                data={chartBuilderPlot.data as Plotly.Data[]}
                layout={chartBuilderPlot.layout as Partial<Plotly.Layout>}
                config={chartBuilderPlot.config}
                style={{ width: '100%' }}
              />
            )}
          </section>

          {/* ── Section 2: Alpha vs Period ────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('statistics.alphaVsPeriod')}</h2>
            <p className="text-xs text-[var(--text-muted)]">{t('statistics.alphaVsPeriodHint')}</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium">{t('statistics.series')}</span>
              {ALPHA_SERIES.map(s => (
                <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSeries.includes(s.key)}
                    onChange={e => {
                      setSelectedSeries(prev =>
                        e.target.checked ? [...prev, s.key] : prev.filter(k => k !== s.key)
                      )
                    }}
                    className="accent-accent"
                  />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
              <span className="mx-2 text-[var(--border)]">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showLitAlpha} onChange={e => setShowLitAlpha(e.target.checked)} className="accent-accent" />
                <span className="text-sm">{t('statistics.litRefLines')}</span>
              </label>
            </div>
            {alphaVsPeriodPlot && (
              <PlotlyChart
                data={alphaVsPeriodPlot.data as Plotly.Data[]}
                layout={alphaVsPeriodPlot.layout as Partial<Plotly.Layout>}
                config={alphaVsPeriodPlot.config}
                style={{ width: '100%' }}
              />
            )}
          </section>

          {/* ── Section 3: Heat-Loss Indicators ──────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('statistics.heatLossIndicators')}</h2>
            <div className="grid grid-cols-3 gap-4">
              {heatLossPlots.map((plot, i) => (
                <PlotlyChart key={i}
                  data={plot.data as Plotly.Data[]}
                  layout={plot.layout as Partial<Plotly.Layout>}
                  config={plot.config}
                  style={{ width: '100%' }}
                />
              ))}
            </div>
          </section>

          {/* ── Section 4: Phase Lag Analysis ────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('statistics.phaseLagAnalysis')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {phaseLagPlots.map((plot, i) => (
                <PlotlyChart key={i}
                  data={plot.data as Plotly.Data[]}
                  layout={plot.layout as Partial<Plotly.Layout>}
                  config={plot.config}
                  style={{ width: '100%' }}
                />
              ))}
            </div>
          </section>

          {/* ── Section 5: Temperature Dependence ────────────────────────── */}
          {tempPlots.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">{t('statistics.tempDependence')}</h2>
              <div className="grid grid-cols-2 gap-4">
                {tempPlots.map((plot, i) => (
                  <PlotlyChart key={i}
                    data={plot.data as Plotly.Data[]}
                    layout={plot.layout as Partial<Plotly.Layout>}
                    config={plot.config}
                    style={{ width: '100%' }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Section 6: Correlation Matrix ────────────────────────────── */}
          {corrPlot && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">{t('statistics.correlationMatrix')}</h2>
              <PlotlyChart
                data={corrPlot.data as unknown as Plotly.Data[]}
                layout={corrPlot.layout as Partial<Plotly.Layout>}
                config={corrPlot.config}
                style={{ width: '100%', maxWidth: '650px' }}
              />
            </section>
          )}

          {/* ── Section 7: Summary Stats by Model ────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('statistics.summaryStatsByModel')}</h2>
            <div className="overflow-x-auto">
              <table className="text-xs border border-[var(--border)] whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="px-2 py-2 text-start border-b border-e border-[var(--border)]">{t('statistics.groupModel')}</th>
                    <th className="px-2 py-2 text-start border-b border-e border-[var(--border)]">N</th>
                    {['\u03B1 comb raw', '\u03B1 phase raw', '\u03B1 comb cal', '\u03B1 phase cal'].map(h => (
                      <th key={h} colSpan={4} className="px-2 py-2 text-center border-b border-s border-[var(--border)]">{h} (mm\u00B2/s)</th>
                    ))}
                  </tr>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="px-2 py-1 border-b border-[var(--border)]" /><th className="px-2 py-1 border-b border-[var(--border)]" />
                    {Array.from({ length: 4 }).map((_, i) => (
                      [t('statistics.mean'), t('statistics.std'), t('statistics.min'), t('statistics.max')].map(s => (
                        <th key={`${i}-${s}`} className="px-2 py-1 text-start border-b border-e border-[var(--border)] text-[var(--text-muted)] font-normal">{s}</th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.map((s, ri) => (
                    <tr key={s.model} className={ri % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]'}>
                      <td className="px-2 py-1.5 border-b border-e border-[var(--border)] font-medium">{s.model}</td>
                      <td className="px-2 py-1.5 border-b border-e border-[var(--border)]">{s.n}</td>
                      {[s.combRaw, s.phaseRaw, s.combCal, s.phaseCal].map((d, di) => (
                        [d.mean, d.std, d.min, d.max].map((v, vi) => (
                          <td key={`${di}-${vi}`} className="px-2 py-1.5 border-b border-e border-[var(--border)]">{v}</td>
                        ))
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={downloadStatsCsv}
              className="mt-3 px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              {t('statistics.downloadStatsCsv')}
            </button>
          </section>
        </>
      )}
    </div>
  )
}
