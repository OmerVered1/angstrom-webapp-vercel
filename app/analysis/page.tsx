'use client'

import { useState, useMemo, useCallback } from 'react'
import PlotlyChart from '@/components/PlotlyChart'
import {
  parseFile,
  extractStartTime,
  extractDateFromFilename,
  extractTemperatureFromFilename,
} from '@/lib/fileParser'
import {
  syncAndFilterData,
  runAutoAnalysis,
  runManualAnalysis,
  type AnalysisParams,
  type AnalysisResults,
  type SyncedData,
  type TimeUnit,
  type PowerUnit,
} from '@/lib/analysis'
import { isConfigured } from '@/lib/supabase'
import { dbInsert } from '@/lib/dbClient'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDDMMYYYY(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtAlpha(v: number): string {
  if (v < 0) return 'N/A'
  const mm2s = v * 1e6
  return mm2s.toPrecision(4) + ' mm\u00B2/s'
}

function extractSampleName(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '').replace(/^.*[\\/]/, '')
  const m = base.match(/^([A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z][A-Za-z0-9]*)*)/)
  if (m && m[1].length >= 2) return m[1].replace(/[-_]/g, ' ')
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalysisPage() {
  // Step control
  const [step, setStep] = useState(1)

  // Step 1 — files
  const [c80File, setC80File] = useState<File | null>(null)
  const [srcFile, setSrcFile] = useState<File | null>(null)
  const [c80Buffer, setC80Buffer] = useState<ArrayBuffer | null>(null)
  const [srcBuffer, setSrcBuffer] = useState<ArrayBuffer | null>(null)

  // Step 1 — auto-detected metadata
  const [autoC80Time, setAutoC80Time] = useState<string | null>(null)
  const [autoSrcTime, setAutoSrcTime] = useState<string | null>(null)
  const [autoDate, setAutoDate] = useState<string | null>(null)
  const [autoTemp, setAutoTemp] = useState<number | null>(null)
  const [autoSample, setAutoSample] = useState<string | null>(null)

  // Step 1 — form fields
  const [c80TimeUnit, setC80TimeUnit] = useState<TimeUnit>('Seconds')
  const [c80PwrUnit, setC80PwrUnit] = useState<PowerUnit>('mW')
  const [srcTimeUnit, setSrcTimeUnit] = useState<TimeUnit>('Seconds')
  const [srcPwrUnit, setSrcPwrUnit] = useState<PowerUnit>('Watts')
  const [tCalInput, setTCalInput] = useState('12:00:00')
  const [tSrcInput, setTSrcInput] = useState('12:05:00')
  const [modelName, setModelName] = useState('Sample-01')
  const [testDate, setTestDate] = useState(todayDDMMYYYY())
  const [testTime, setTestTime] = useState(nowHHMM())
  const [temperature, setTemperature] = useState(25.0)
  const [r1, setR1] = useState(6.72)
  const [r2, setR2] = useState(14.86)
  const [useCalibration, setUseCalibration] = useState(true)
  const [systemLag, setSystemLag] = useState(105.0)
  const [analysisMode, setAnalysisMode] = useState<'Auto' | 'Manual'>('Auto')

  // Step 2 — synced data & region
  const [synced, setSynced] = useState<SyncedData | null>(null)
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(100)
  const [selMin, setSelMin] = useState(30)
  const [selMax, setSelMax] = useState(70)

  // Step 2 — manual peaks
  const [manualPeak1, setManualPeak1] = useState(0)
  const [manualPeak2, setManualPeak2] = useState(0)
  const [manualResp, setManualResp] = useState(0)

  // Step 3 — results
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Loading/error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── File handlers ─────────────────────────────────────────────────────────

  const handleC80Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setC80File(file)
    const buf = await file.arrayBuffer()
    setC80Buffer(buf)

    const startTime = extractStartTime(buf, file.name)
    if (startTime) {
      setAutoC80Time(startTime)
      setTCalInput(startTime)
    }
    const date = extractDateFromFilename(file.name)
    if (date) {
      setAutoDate(date)
      setTestDate(date)
    }
    const temp = extractTemperatureFromFilename(file.name)
    if (temp !== null) {
      setAutoTemp(temp)
      setTemperature(temp)
    }
    const sample = extractSampleName(file.name)
    if (sample) {
      setAutoSample(sample)
      setModelName(sample)
    }
  }, [])

  const handleSrcUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSrcFile(file)
    const buf = await file.arrayBuffer()
    setSrcBuffer(buf)

    const startTime = extractStartTime(buf, file.name)
    if (startTime) {
      setAutoSrcTime(startTime)
      setTSrcInput(startTime)
    }
  }, [])

  // ── Step 1 → Step 2: Load & Process ───────────────────────────────────────

  const handleLoadFiles = useCallback(async () => {
    setError('')
    if (!c80File || !srcFile || !c80Buffer || !srcBuffer) {
      setError('Please upload both data files.')
      return
    }

    setLoading(true)
    try {
      const c80Data = parseFile(c80Buffer, c80File.name)
      const srcData = parseFile(srcBuffer, srcFile.name)
      if (!c80Data || !srcData) {
        setError('Could not parse one or both files. Check the file format.')
        return
      }

      const params: AnalysisParams = {
        modelName, testDate, testTime,
        tCal: tCalInput, tSrc: tSrcInput,
        r1Mm: r1, r2Mm: r2,
        c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit,
        useCalibration, systemLag,
        analysisMode,
      }

      const data = syncAndFilterData(
        c80Data.time, c80Data.value,
        srcData.time, srcData.value,
        params,
      )

      if (data.tCal.length < 20 || data.tSrc.length < 20) {
        setError('Not enough overlapping data after clock synchronisation. Check start times.')
        return
      }

      setSynced(data)

      const allTimes = [...data.tSrc, ...data.tCal]
      const tMin = Math.min(...allTimes)
      const tMax = Math.max(...allTimes)
      setRangeMin(tMin)
      setRangeMax(tMax)

      const span = tMax - tMin
      setSelMin(Math.round(tMin + span * 0.3))
      setSelMax(Math.round(tMin + span * 0.7))

      setManualPeak1(Math.round(tMin + span * 0.35))
      setManualPeak2(Math.round(tMin + span * 0.5))
      setManualResp(Math.round(tMin + span * 0.45))

      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [c80File, srcFile, c80Buffer, srcBuffer, modelName, testDate, testTime, tCalInput, tSrcInput, r1, r2, c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit, useCalibration, systemLag, analysisMode])

  // ── Step 2 → Step 3: Run Analysis ─────────────────────────────────────────

  const handleRunAnalysis = useCallback(() => {
    if (!synced) return
    setError('')
    setLoading(true)

    try {
      const params: AnalysisParams = {
        modelName, testDate, testTime,
        tCal: tCalInput, tSrc: tSrcInput,
        r1Mm: r1, r2Mm: r2,
        c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit,
        useCalibration, systemLag,
        analysisMode,
      }

      const tSrcFilt: number[] = []
      const vSrcFilt: number[] = []
      for (let i = 0; i < synced.tSrc.length; i++) {
        if (synced.tSrc[i] >= selMin && synced.tSrc[i] <= selMax) {
          tSrcFilt.push(synced.tSrc[i])
          vSrcFilt.push(synced.vSrc[i])
        }
      }
      const tCalFilt: number[] = []
      const vCalFilt: number[] = []
      for (let i = 0; i < synced.tCal.length; i++) {
        if (synced.tCal[i] >= selMin && synced.tCal[i] <= selMax) {
          tCalFilt.push(synced.tCal[i])
          vCalFilt.push(synced.vCal[i])
        }
      }

      if (tSrcFilt.length < 10 || tCalFilt.length < 10) {
        setError('Selected region has too few data points. Widen the selection range.')
        return
      }

      let res: AnalysisResults
      if (analysisMode === 'Auto') {
        res = runAutoAnalysis(tCalFilt, vCalFilt, tSrcFilt, vSrcFilt, params, selMin, selMax)
      } else {
        const clicks: [number, number][] = [
          [manualPeak1, 0],
          [manualPeak2, 0],
          [manualResp, 0],
        ]
        res = runManualAnalysis(tCalFilt, vCalFilt, tSrcFilt, vSrcFilt, params, selMin, selMax, clicks)
      }

      setResults(res)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }, [synced, selMin, selMax, modelName, testDate, testTime, tCalInput, tSrcInput, r1, r2, c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit, useCalibration, systemLag, analysisMode, manualPeak1, manualPeak2, manualResp])

  // ── Save to database ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!results || !isConfigured) return
    setSaving(true)
    setSaveMsg('')
    try {
      const row = {
        model_name: modelName,
        test_date: testDate,
        test_time: testTime,
        temperature_c: temperature,
        analysis_mode: analysisMode,
        r1_mm: r1,
        r2_mm: r2,
        amplitude_a1: results.amplitudeA1,
        amplitude_a2: results.amplitudeA2,
        period_t: results.periodT,
        frequency_f: results.frequencyF,
        angular_freq_w: results.angularFreqW,
        raw_lag_dt: results.rawLagDt,
        raw_phase_phi: results.rawPhasePhi,
        ln_term: results.lnTerm,
        alpha_combined_raw: results.alphaCombinedRaw,
        alpha_phase_raw: results.alphaPhaseRaw,
        use_calibration: useCalibration,
        system_lag: useCalibration ? systemLag : null,
        net_lag_dt: useCalibration ? results.netLagDt : null,
        net_phase_phi: useCalibration ? results.netPhasePhi : null,
        alpha_combined_cal: useCalibration ? results.alphaCombinedCal : null,
        alpha_phase_cal: useCalibration ? results.alphaPhaseCal : null,
      }
      const { error: dbErr } = await dbInsert('analyses', row)
      if (dbErr) throw new Error(dbErr)
      setSaveMsg('Saved successfully!')
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [results, modelName, testDate, testTime, temperature, analysisMode, r1, r2, useCalibration, systemLag])

  // ── Download CSV ──────────────────────────────────────────────────────────

  const handleDownloadCSV = useCallback(() => {
    if (!results) return
    const rows = [
      ['Parameter', 'Value'],
      ['Model Name', modelName],
      ['Test Date', testDate],
      ['r1 (mm)', r1.toString()],
      ['r2 (mm)', r2.toString()],
      ['Amplitude A1 (mW)', results.amplitudeA1.toFixed(4)],
      ['Amplitude A2 (mW)', results.amplitudeA2.toFixed(4)],
      ['Period T (s)', results.periodT.toFixed(4)],
      ['Frequency f (Hz)', results.frequencyF.toFixed(6)],
      ['Angular Freq w (rad/s)', results.angularFreqW.toFixed(6)],
      ['Raw Time Lag dt (s)', results.rawLagDt.toFixed(4)],
      ['Raw Phase phi (rad)', results.rawPhasePhi.toFixed(6)],
      ['ln(A1*sqrt(r1) / A2*sqrt(r2))', results.lnTerm.toFixed(6)],
      ['alpha Combined Raw (mm2/s)', (results.alphaCombinedRaw * 1e6).toPrecision(4)],
      ['alpha Phase Raw (mm2/s)', (results.alphaPhaseRaw * 1e6).toPrecision(4)],
      ['Calibration Enabled', String(useCalibration)],
      ['System Lag (s)', useCalibration ? systemLag.toFixed(1) : 'N/A'],
      ['alpha Combined Cal (mm2/s)', useCalibration ? (results.alphaCombinedCal * 1e6).toPrecision(4) : 'N/A'],
      ['alpha Phase Cal (mm2/s)', useCalibration ? (results.alphaPhaseCal * 1e6).toPrecision(4) : 'N/A'],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${modelName.replace(/\s+/g, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results, modelName, testDate, r1, r2, useCalibration, systemLag])

  // ── Overview plot (Step 2) ────────────────────────────────────────────────

  const overviewPlot = useMemo(() => {
    if (!synced) return null

    return {
      data: [
        {
          x: synced.tSrc,
          y: synced.vSrc,
          name: 'Source (Keithley)',
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: '#3498db', width: 1.5 },
        },
        {
          x: synced.tCal,
          y: synced.vCal,
          name: 'Response (C80)',
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: '#e74c3c', width: 1.5 },
          yaxis: 'y2' as const,
        },
      ],
      layout: {
        title: 'Full Experiment Overview',
        height: 420,
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Source Power (mW)', side: 'left' as const, titlefont: { color: '#3498db' } },
        yaxis2: {
          title: 'Response Power (mW)',
          side: 'right' as const,
          overlaying: 'y' as const,
          titlefont: { color: '#e74c3c' },
        },
        legend: { orientation: 'h' as const, y: 1.12 },
        hovermode: 'x unified' as const,
        shapes: [
          {
            type: 'rect' as const,
            x0: selMin,
            x1: selMax,
            y0: 0,
            y1: 1,
            yref: 'paper' as const,
            fillcolor: 'rgba(46,204,113,0.15)',
            line: { color: 'rgba(46,204,113,0.5)', width: 1 },
          },
        ],
        margin: { t: 60, b: 50 },
      },
      config: { responsive: true },
    }
  }, [synced, selMin, selMax])

  // ── Analysis plot (Step 3) ────────────────────────────────────────────────

  const analysisPlot = useMemo(() => {
    if (!synced || !results) return null

    const tSrcF: number[] = [], vSrcF: number[] = []
    for (let i = 0; i < synced.tSrc.length; i++) {
      if (synced.tSrc[i] >= selMin && synced.tSrc[i] <= selMax) {
        tSrcF.push(synced.tSrc[i])
        vSrcF.push(synced.vSrc[i])
      }
    }
    const tCalF: number[] = [], vCalF: number[] = []
    for (let i = 0; i < synced.tCal.length; i++) {
      if (synced.tCal[i] >= selMin && synced.tCal[i] <= selMax) {
        tCalF.push(synced.tCal[i])
        vCalF.push(synced.vCal[i])
      }
    }

    const srcMean = vSrcF.reduce((a, b) => a + b, 0) / vSrcF.length
    const calMean = vCalF.reduce((a, b) => a + b, 0) / vCalF.length

    return {
      data: [
        {
          x: tSrcF, y: vSrcF, name: 'Source', type: 'scatter' as const, mode: 'lines' as const,
          line: { color: '#3498db', width: 2 },
        },
        {
          x: tCalF, y: vCalF, name: 'Response', type: 'scatter' as const, mode: 'lines' as const,
          line: { color: '#e74c3c', width: 2 }, yaxis: 'y2' as const,
        },
      ],
      layout: {
        title: `Stable Zone Analysis \u2014 \u0394t = ${results.rawLagDt.toFixed(2)}s`,
        height: 500,
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Source (mW)', side: 'left' as const, titlefont: { color: '#3498db' } },
        yaxis2: {
          title: 'Response (mW)', side: 'right' as const, overlaying: 'y' as const,
          titlefont: { color: '#e74c3c' },
        },
        legend: { orientation: 'h' as const, y: 1.12 },
        hovermode: 'x unified' as const,
        shapes: [
          {
            type: 'line' as const, x0: selMin, x1: selMax, y0: srcMean, y1: srcMean,
            line: { color: '#3498db', dash: 'dash' as const, width: 1 },
          },
          {
            type: 'line' as const, x0: selMin, x1: selMax, y0: calMean, y1: calMean,
            yref: 'y2' as const,
            line: { color: '#e74c3c', dash: 'dash' as const, width: 1 },
          },
          {
            type: 'line' as const, x0: results.markerSrcTime, x1: results.markerSrcTime,
            y0: 0, y1: 1, yref: 'paper' as const,
            line: { color: '#3498db', dash: 'dashdot' as const, width: 1.5 },
          },
          {
            type: 'line' as const, x0: results.markerCalTime, x1: results.markerCalTime,
            y0: 0, y1: 1, yref: 'paper' as const,
            line: { color: '#e74c3c', dash: 'dashdot' as const, width: 1.5 },
          },
        ],
        annotations: [
          {
            x: results.markerSrcTime, y: 1.05, yref: 'paper' as const, text: 'Src Peak',
            showarrow: false, font: { color: '#3498db', size: 11 },
          },
          {
            x: results.markerCalTime, y: 1.05, yref: 'paper' as const, text: 'Resp Peak',
            showarrow: false, font: { color: '#e74c3c', size: 11 },
          },
        ],
        margin: { t: 60, b: 50 },
      },
      config: { responsive: true },
    }
  }, [synced, results, selMin, selMax])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCCA'} New Analysis</h1>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── STEP 1: File Upload & Parameters ─────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold">1. File Upload &amp; Parameters</h2>

        {/* File uploads — two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* C80 (Response) */}
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
            <h3 className="font-semibold">Power Response Data (C80)</h3>
            <input
              type="file"
              accept=".csv,.txt,.dat,.xls,.xlsx"
              onChange={handleC80Upload}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer"
            />
            {autoC80Time && (
              <p className="text-xs text-green-600 dark:text-green-400">Auto-detected start time: {autoC80Time}</p>
            )}
            {(autoDate || autoTemp !== null || autoSample) && (
              <p className="text-xs text-accent">
                Auto-detected: {[autoSample && `Sample: ${autoSample}`, autoDate && `Date: ${autoDate}`, autoTemp !== null && `Temp: ${autoTemp}\u00B0C`].filter(Boolean).join(' \u00B7 ')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Time Unit</label>
                <select value={c80TimeUnit} onChange={e => setC80TimeUnit(e.target.value as TimeUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Seconds</option><option>Minutes</option><option>Hours</option><option>ms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Power Unit</label>
                <select value={c80PwrUnit} onChange={e => setC80PwrUnit(e.target.value as PowerUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>mW</option><option>Watts</option><option>uW</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Response Start Time (HH:MM:SS)</label>
              <input type="text" value={tCalInput} onChange={e => setTCalInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
            </div>
          </div>

          {/* Keithley (Source) */}
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
            <h3 className="font-semibold">Power Source Data (Keithley)</h3>
            <input
              type="file"
              accept=".csv,.txt,.dat,.xls,.xlsx"
              onChange={handleSrcUpload}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer"
            />
            {autoSrcTime && (
              <p className="text-xs text-green-600 dark:text-green-400">Auto-detected start time: {autoSrcTime}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Time Unit</label>
                <select value={srcTimeUnit} onChange={e => setSrcTimeUnit(e.target.value as TimeUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Seconds</option><option>Minutes</option><option>Hours</option><option>ms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Power Unit</label>
                <select value={srcPwrUnit} onChange={e => setSrcPwrUnit(e.target.value as PowerUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Watts</option><option>mW</option><option>uW</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Source Start Time (HH:MM:SS)</label>
              <input type="text" value={tSrcInput} onChange={e => setTSrcInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Model / Sample Name</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Test Date (DD/MM/YYYY)</label>
            <input type="text" value={testDate} onChange={e => setTestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Test Time (HH:MM)</label>
            <input type="text" value={testTime} onChange={e => setTestTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Temperature (\u00B0C)</label>
            <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
              min={-50} max={500} step={0.1}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Inner Radius r{'\u2081'} (mm)</label>
            <input type="number" value={r1} onChange={e => setR1(Number(e.target.value))}
              min={0.1} step={0.01}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Outer Radius r{'\u2082'} (mm)</label>
            <input type="number" value={r2} onChange={e => setR2(Number(e.target.value))}
              min={0.1} step={0.01}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
        </div>

        {/* Calibration & Mode */}
        <div className="flex items-center gap-6 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useCalibration} onChange={e => setUseCalibration(e.target.checked)}
              className="w-4 h-4 rounded accent-accent" />
            <span className="text-sm font-medium">Enable System Calibration</span>
          </label>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">System Lag (s)</label>
            <input type="number" value={systemLag} onChange={e => setSystemLag(Number(e.target.value))}
              disabled={!useCalibration} step={0.1}
              className="w-32 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm disabled:opacity-50" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Mode:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mode" value="Auto" checked={analysisMode === 'Auto'}
                onChange={() => setAnalysisMode('Auto')} className="accent-accent" />
              <span className="text-sm">Auto</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mode" value="Manual" checked={analysisMode === 'Manual'}
                onChange={() => setAnalysisMode('Manual')} className="accent-accent" />
              <span className="text-sm">Manual</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleLoadFiles}
          disabled={loading || !c80File || !srcFile}
          className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading && step < 2 ? 'Processing\u2026' : 'Load & Process Files'}
        </button>
      </section>

      {/* ── STEP 2: Select Analysis Region ────────────────────────────────── */}
      {step >= 2 && synced && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">2. Select Analysis Region</h2>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium whitespace-nowrap">Region:</label>
              <input
                type="range"
                min={rangeMin}
                max={rangeMax}
                step={1}
                value={selMin}
                onChange={e => setSelMin(Math.min(Number(e.target.value), selMax - 10))}
                className="flex-1 accent-success"
              />
              <input
                type="range"
                min={rangeMin}
                max={rangeMax}
                step={1}
                value={selMax}
                onChange={e => setSelMax(Math.max(Number(e.target.value), selMin + 10))}
                className="flex-1 accent-success"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Selected: {selMin.toFixed(0)}s \u2014 {selMax.toFixed(0)}s (of {rangeMin.toFixed(0)}s \u2014 {rangeMax.toFixed(0)}s)
            </p>
          </div>

          {overviewPlot && (
            <PlotlyChart
              data={overviewPlot.data as Plotly.Data[]}
              layout={overviewPlot.layout as Partial<Plotly.Layout>}
              config={overviewPlot.config}
              style={{ width: '100%' }}
            />
          )}

          {analysisMode === 'Manual' && (
            <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
              <p className="text-sm text-accent font-medium">
                Manual Mode \u2014 Read peak times from the plot above and enter them below.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Source Peak 1 time (s)</label>
                  <input type="number" value={manualPeak1} onChange={e => setManualPeak1(Number(e.target.value))}
                    step={0.1}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Source Peak 2 time (s)</label>
                  <input type="number" value={manualPeak2} onChange={e => setManualPeak2(Number(e.target.value))}
                    step={0.1}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Response Peak time (s)</label>
                  <input type="number" value={manualResp} onChange={e => setManualResp(Number(e.target.value))}
                    step={0.1}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-success text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading && step === 2 ? 'Analysing\u2026' : 'Run Analysis'}
          </button>
        </section>
      )}

      {/* ── STEP 3: Results ───────────────────────────────────────────────── */}
      {step >= 3 && results && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">3. Analysis Results</h2>

          {/* Thermal diffusivity metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{'\u03B1'} Combined (Raw)</p>
              <p className="text-xl font-bold">{fmtAlpha(results.alphaCombinedRaw)}</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{'\u03B1'} Phase (Raw)</p>
              <p className="text-xl font-bold">{fmtAlpha(results.alphaPhaseRaw)}</p>
            </div>
            {useCalibration && (
              <>
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{'\u03B1'} Combined (Calibrated)</p>
                  <p className="text-xl font-bold text-accent">{fmtAlpha(results.alphaCombinedCal)}</p>
                </div>
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{'\u03B1'} Phase (Calibrated)</p>
                  <p className="text-xl font-bold text-accent">{fmtAlpha(results.alphaPhaseCal)}</p>
                </div>
              </>
            )}
          </div>

          {/* Analysis chart */}
          {analysisPlot && (
            <PlotlyChart
              data={analysisPlot.data as Plotly.Data[]}
              layout={analysisPlot.layout as Partial<Plotly.Layout>}
              config={analysisPlot.config}
              style={{ width: '100%' }}
            />
          )}

          {/* Results table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-4 py-2 text-left border-b border-[var(--border)]">Parameter</th>
                  <th className="px-4 py-2 text-left border-b border-[var(--border)]">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Model Name', modelName],
                  ['Test Date', testDate],
                  ['Temperature', `${temperature} \u00B0C`],
                  ['r\u2081', `${r1} mm`],
                  ['r\u2082', `${r2} mm`],
                  ['Amplitude A\u2081', `${results.amplitudeA1.toFixed(4)} mW`],
                  ['Amplitude A\u2082', `${results.amplitudeA2.toFixed(4)} mW`],
                  ['Period T', `${results.periodT.toFixed(4)} s`],
                  ['Frequency f', `${results.frequencyF.toFixed(6)} Hz`],
                  ['Angular Freq \u03C9', `${results.angularFreqW.toFixed(6)} rad/s`],
                  ['Raw Time Lag \u0394t', `${results.rawLagDt.toFixed(4)} s`],
                  ['Raw Phase \u03C6', `${results.rawPhasePhi.toFixed(6)} rad`],
                  ['ln(A\u2081\u221Ar\u2081 / A\u2082\u221Ar\u2082)', results.lnTerm.toFixed(6)],
                  ['\u03B1 Combined (Raw)', fmtAlpha(results.alphaCombinedRaw)],
                  ['\u03B1 Phase (Raw)', fmtAlpha(results.alphaPhaseRaw)],
                  ['Calibration', useCalibration ? 'Enabled' : 'Disabled'],
                  ...(useCalibration
                    ? [
                        ['System Lag', `${systemLag.toFixed(1)} s`],
                        ['Net Time Lag', `${results.netLagDt.toFixed(4)} s`],
                        ['Net Phase', `${results.netPhasePhi.toFixed(6)} rad`],
                        ['\u03B1 Combined (Cal)', fmtAlpha(results.alphaCombinedCal)],
                        ['\u03B1 Phase (Cal)', fmtAlpha(results.alphaPhaseCal)],
                      ]
                    : []),
                ].map(([param, val], i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]'}>
                    <td className="px-4 py-2 border-b border-[var(--border)] font-medium">{param}</td>
                    <td className="px-4 py-2 border-b border-[var(--border)]">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save & Export */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleDownloadCSV}
              className="px-5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] font-semibold text-sm hover:opacity-80 transition-opacity"
            >
              Download CSV
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isConfigured}
              className="px-5 py-2.5 rounded-lg bg-success text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving\u2026' : 'Save to Database'}
            </button>
            {!isConfigured && (
              <span className="text-xs text-[var(--text-muted)]">Supabase not configured \u2014 set env vars to enable saving.</span>
            )}
            {saveMsg && (
              <span className={`text-sm font-medium ${saveMsg.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
