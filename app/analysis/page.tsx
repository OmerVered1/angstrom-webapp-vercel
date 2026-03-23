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
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { t } = useLanguage()

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
  const [plotRevision, setPlotRevision] = useState(0)

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
      setError(t('analysis.errUploadBoth'))
      return
    }

    setLoading(true)
    try {
      const c80Data = parseFile(c80Buffer, c80File.name)
      const srcData = parseFile(srcBuffer, srcFile.name)
      if (!c80Data || !srcData) {
        setError(t('analysis.errParseFailed'))
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
        setError(t('analysis.errNotEnoughOverlap'))
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
  }, [c80File, srcFile, c80Buffer, srcBuffer, modelName, testDate, testTime, tCalInput, tSrcInput, r1, r2, c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit, useCalibration, systemLag, analysisMode, t])

  // ── Handle draggable peak lines on chart ──────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRelayout = useCallback((update: any) => {
    if (analysisMode !== 'Manual') return
    // Shapes: [0] = green rect, [1] = P1, [2] = P2, [3] = R
    if (update['shapes[1].x0'] != null) setManualPeak1(Math.round(update['shapes[1].x0']))
    if (update['shapes[2].x0'] != null) setManualPeak2(Math.round(update['shapes[2].x0']))
    if (update['shapes[3].x0'] != null) setManualResp(Math.round(update['shapes[3].x0']))
  }, [analysisMode])

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
        setError(t('analysis.errTooFewPoints'))
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
      setError(err instanceof Error ? err.message : t('analysis.errAnalysisFailed'))
    } finally {
      setLoading(false)
    }
  }, [synced, selMin, selMax, modelName, testDate, testTime, tCalInput, tSrcInput, r1, r2, c80TimeUnit, c80PwrUnit, srcTimeUnit, srcPwrUnit, useCalibration, systemLag, analysisMode, manualPeak1, manualPeak2, manualResp, t])

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
          // Amplitude envelope — Source: mean ± A1
          {
            type: 'line' as const, x0: selMin, x1: selMax,
            y0: srcMean + results.amplitudeA1, y1: srcMean + results.amplitudeA1,
            line: { color: '#27ae60', dash: 'dot' as const, width: 2 },
          },
          {
            type: 'line' as const, x0: selMin, x1: selMax,
            y0: srcMean - results.amplitudeA1, y1: srcMean - results.amplitudeA1,
            line: { color: '#27ae60', dash: 'dot' as const, width: 2 },
          },
          // Amplitude envelope — Response: mean ± A2
          {
            type: 'line' as const, x0: selMin, x1: selMax,
            y0: calMean + results.amplitudeA2, y1: calMean + results.amplitudeA2,
            yref: 'y2' as const,
            line: { color: '#f39c12', dash: 'dot' as const, width: 2 },
          },
          {
            type: 'line' as const, x0: selMin, x1: selMax,
            y0: calMean - results.amplitudeA2, y1: calMean - results.amplitudeA2,
            yref: 'y2' as const,
            line: { color: '#f39c12', dash: 'dot' as const, width: 2 },
          },
          {
            type: 'line' as const, x0: results.markerSrcTime, x1: results.markerSrcTime,
            y0: 0, y1: 1, yref: 'paper' as const,
            line: { color: '#3498db', dash: 'dashdot' as const, width: 1.5 },
          },
          {
            type: 'line' as const, x0: results.markerSrc2Time, x1: results.markerSrc2Time,
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
            x: results.markerSrcTime, y: 1.05, yref: 'paper' as const, text: 'Src Peak 1',
            showarrow: false, font: { color: '#3498db', size: 11 },
          },
          {
            x: results.markerSrc2Time, y: 1.05, yref: 'paper' as const, text: 'Src Peak 2',
            showarrow: false, font: { color: '#3498db', size: 11 },
          },
          {
            x: results.markerCalTime, y: 1.05, yref: 'paper' as const, text: 'Resp Peak',
            showarrow: false, font: { color: '#e74c3c', size: 11 },
          },
          // Amplitude envelope labels — Source (green)
          {
            x: selMin, y: srcMean + results.amplitudeA1, xanchor: 'left' as const,
            text: `  A1 = ${results.amplitudeA1.toFixed(1)} mW`,
            showarrow: false, font: { color: '#27ae60', size: 11, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.8)',
          },
          {
            x: selMin, y: srcMean - results.amplitudeA1, xanchor: 'left' as const,
            text: `  −A1`,
            showarrow: false, font: { color: '#27ae60', size: 11, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.8)',
          },
          // Amplitude envelope labels — Response (orange)
          {
            x: selMax, y: calMean + results.amplitudeA2, xanchor: 'right' as const,
            yref: 'y2' as const,
            text: `A2 = ${results.amplitudeA2.toFixed(1)} mW  `,
            showarrow: false, font: { color: '#f39c12', size: 11, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.8)',
          },
          {
            x: selMax, y: calMean - results.amplitudeA2, xanchor: 'right' as const,
            yref: 'y2' as const,
            text: `−A2  `,
            showarrow: false, font: { color: '#f39c12', size: 11, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.8)',
          },
        ],
        margin: { t: 60, b: 50 },
      },
      config: { responsive: true },
    }
  }, [synced, results, selMin, selMax])

  // ── Save to database ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!results || !isConfigured) return
    setSaving(true)
    setSaveMsg('')
    try {
      const row: Record<string, unknown> = {
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
      // Save the analysis plot as Plotly JSON so History page can display it
      if (analysisPlot) {
        try {
          const graphStr = JSON.stringify({ data: analysisPlot.data, layout: analysisPlot.layout })
          row.graph_image = graphStr
        } catch { /* ignore serialization errors */ }
      }
      const { error: dbErr } = await dbInsert('analyses', row)
      if (dbErr) throw new Error(dbErr)
      setSaveMsg(t('common.savedSuccess'))
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [results, modelName, testDate, testTime, temperature, analysisMode, r1, r2, useCalibration, systemLag, analysisPlot, t])

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
        uirevision: analysisMode === 'Manual' ? `manual-${plotRevision}` : 'auto',
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
          ...(analysisMode === 'Manual' ? [
            { type: 'line' as const, x0: manualPeak1, x1: manualPeak1, y0: 0, y1: 1, yref: 'paper' as const, line: { color: '#3498db', dash: 'dot' as const, width: 3 } },
            { type: 'line' as const, x0: manualPeak2, x1: manualPeak2, y0: 0, y1: 1, yref: 'paper' as const, line: { color: '#2980b9', dash: 'dot' as const, width: 3 } },
            { type: 'line' as const, x0: manualResp, x1: manualResp, y0: 0, y1: 1, yref: 'paper' as const, line: { color: '#e74c3c', dash: 'dot' as const, width: 3 } },
          ] : []),
        ],
        annotations: analysisMode === 'Manual' ? [
          { x: manualPeak1, y: 1, yref: 'paper' as const, text: 'P1', showarrow: false, font: { color: '#3498db', size: 12, weight: 700 }, yanchor: 'bottom' as const },
          { x: manualPeak2, y: 1, yref: 'paper' as const, text: 'P2', showarrow: false, font: { color: '#2980b9', size: 12, weight: 700 }, yanchor: 'bottom' as const },
          { x: manualResp, y: 1, yref: 'paper' as const, text: 'R', showarrow: false, font: { color: '#e74c3c', size: 12, weight: 700 }, yanchor: 'bottom' as const },
        ] : [],
        margin: { t: 60, b: 50 },
      },
      config: { responsive: true, edits: analysisMode === 'Manual' ? { shapePosition: true } : {} },
    }
  }, [synced, selMin, selMax, analysisMode, plotRevision, manualPeak1, manualPeak2, manualResp])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCCA'} {t('analysis.title')}</h1>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── STEP 1: File Upload & Parameters ─────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold">{t('analysis.step1Title')}</h2>

        {/* File uploads — two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* C80 (Response) */}
          <div className="p-4 rounded-lg border border-[var(--border)] border-l-4 border-l-accent bg-[var(--bg-secondary)] space-y-3 hover:border-accent transition-colors">
            <h3 className="font-semibold">{t('analysis.responseData')}</h3>
            <input
              type="file"
              accept=".csv,.txt,.dat,.xls,.xlsx"
              onChange={handleC80Upload}
              className="block w-full text-sm cursor-pointer rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-3 file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer hover:border-accent transition-colors"
            />
            {autoC80Time && (
              <p className="text-xs text-green-600 dark:text-green-400">{t('analysis.autoDetectedStartTime')} {autoC80Time}</p>
            )}
            {(autoDate || autoTemp !== null || autoSample) && (
              <p className="text-xs text-accent">
                {t('analysis.autoDetected')} {[autoSample && `Sample: ${autoSample}`, autoDate && `Date: ${autoDate}`, autoTemp !== null && `Temp: ${autoTemp}\u00B0C`].filter(Boolean).join(' \u00B7 ')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.timeUnit')}</label>
                <select value={c80TimeUnit} onChange={e => setC80TimeUnit(e.target.value as TimeUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Seconds</option><option>Minutes</option><option>Hours</option><option>ms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.powerUnit')}</label>
                <select value={c80PwrUnit} onChange={e => setC80PwrUnit(e.target.value as PowerUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>mW</option><option>Watts</option><option>uW</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.responseStartTime')}</label>
              <input type="text" value={tCalInput} onChange={e => setTCalInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
            </div>
          </div>

          {/* Keithley (Source) */}
          <div className="p-4 rounded-lg border border-[var(--border)] border-l-4 border-l-accent bg-[var(--bg-secondary)] space-y-3 hover:border-accent transition-colors">
            <h3 className="font-semibold">{t('analysis.sourceData')}</h3>
            <input
              type="file"
              accept=".csv,.txt,.dat,.xls,.xlsx"
              onChange={handleSrcUpload}
              className="block w-full text-sm cursor-pointer rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-3 file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer hover:border-accent transition-colors"
            />
            {autoSrcTime && (
              <p className="text-xs text-green-600 dark:text-green-400">{t('analysis.autoDetectedStartTime')} {autoSrcTime}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.timeUnit')}</label>
                <select value={srcTimeUnit} onChange={e => setSrcTimeUnit(e.target.value as TimeUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Seconds</option><option>Minutes</option><option>Hours</option><option>ms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.powerUnit')}</label>
                <select value={srcPwrUnit} onChange={e => setSrcPwrUnit(e.target.value as PowerUnit)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm">
                  <option>Watts</option><option>mW</option><option>uW</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.sourceStartTime')}</label>
              <input type="text" value={tSrcInput} onChange={e => setTSrcInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
            </div>
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Metadata */}
        <h3 className="text-lg font-semibold">{t('analysis.experimentMetadata')}</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.modelName')}</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.testDate')}</label>
            <input type="text" value={testDate} onChange={e => setTestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.testTime')}</label>
            <input type="text" value={testTime} onChange={e => setTestTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.temperature')}</label>
            <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
              min={-50} max={500} step={0.1}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.innerRadius')}</label>
            <input type="number" value={r1} onChange={e => setR1(Number(e.target.value))}
              min={0.1} step={0.01}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.outerRadius')}</label>
            <input type="number" value={r2} onChange={e => setR2(Number(e.target.value))}
              min={0.1} step={0.01}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm" />
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Calibration & Mode */}
        <h3 className="text-lg font-semibold">{t('analysis.calibrationSettings')}</h3>
        <div className="flex items-center gap-6 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useCalibration} onChange={e => setUseCalibration(e.target.checked)}
              className="w-4 h-4 rounded accent-accent" />
            <span className="text-sm font-medium">{t('analysis.enableCalibration')}</span>
          </label>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('analysis.systemLag')}</label>
            <input type="number" value={systemLag} onChange={e => setSystemLag(Number(e.target.value))}
              disabled={!useCalibration} step={0.1}
              className="w-32 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm disabled:opacity-50" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{t('analysis.mode')}</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mode" value="Auto" checked={analysisMode === 'Auto'}
                onChange={() => setAnalysisMode('Auto')} className="accent-accent" />
              <span className="text-sm">{t('analysis.auto')}</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mode" value="Manual" checked={analysisMode === 'Manual'}
                onChange={() => setAnalysisMode('Manual')} className="accent-accent" />
              <span className="text-sm">{t('analysis.manual')}</span>
            </label>
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        <button
          onClick={handleLoadFiles}
          disabled={loading || !c80File || !srcFile}
          className="w-full px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-base shadow-md"
        >
          {loading && step < 2 ? t('analysis.processing') : t('analysis.loadProcessFiles')}
        </button>
      </section>

      {/* ── STEP 2: Select Analysis Region ────────────────────────────────── */}
      {step >= 2 && synced && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">{t('analysis.step2Title')}</h2>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium whitespace-nowrap">{t('analysis.region')}</label>
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
              {t('analysis.selected')} {selMin.toFixed(0)}s \u2014 {selMax.toFixed(0)}s (of {rangeMin.toFixed(0)}s \u2014 {rangeMax.toFixed(0)}s)
            </p>
          </div>

          {overviewPlot && (
            <PlotlyChart
              data={overviewPlot.data as Plotly.Data[]}
              layout={overviewPlot.layout as Partial<Plotly.Layout>}
              config={overviewPlot.config}
              style={{ width: '100%' }}
              onRelayout={analysisMode === 'Manual' ? handleRelayout : undefined}
            />
          )}

          {analysisMode === 'Manual' && (
            <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
              <p className="text-sm text-accent font-medium">
                {t('analysis.manualModeDesc')}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: t('analysis.srcPeak1'), value: manualPeak1, setter: setManualPeak1, color: '#3498db' },
                  { label: t('analysis.srcPeak2'), value: manualPeak2, setter: setManualPeak2, color: '#2980b9' },
                  { label: t('analysis.respPeak'), value: manualResp, setter: setManualResp, color: '#e74c3c' },
                ]).map(({ label, value, setter, color }) => (
                  <div key={label} className="p-3 rounded-lg border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <label className="text-xs font-medium">{label}</label>
                    </div>
                    <input
                      type="number"
                      value={value}
                      onChange={e => { setter(Number(e.target.value)); setPlotRevision(r => r + 1) }}
                      step={0.1}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-success text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading && step === 2 ? t('analysis.analysing') : t('analysis.runAnalysis')}
          </button>
        </section>
      )}

      {/* ── STEP 3: Results ───────────────────────────────────────────────── */}
      {step >= 3 && results && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">{t('analysis.step3Title')}</h2>

          {/* Thermal diffusivity metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--border)] border-l-4 border-l-accent bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('analysis.alphaCombinedRaw')}</p>
              <p className="text-xl font-bold">{fmtAlpha(results.alphaCombinedRaw)}</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border)] border-l-4 border-l-accent bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('analysis.alphaPhaseRaw')}</p>
              <p className="text-xl font-bold">{fmtAlpha(results.alphaPhaseRaw)}</p>
            </div>
            {useCalibration && (
              <>
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{t('analysis.alphaCombinedCal')}</p>
                  <p className="text-xl font-bold text-accent">{fmtAlpha(results.alphaCombinedCal)}</p>
                </div>
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{t('analysis.alphaPhaseCal')}</p>
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
                  <th className="px-4 py-2 text-start border-b border-[var(--border)]">{t('common.parameter')}</th>
                  <th className="px-4 py-2 text-start border-b border-[var(--border)]">{t('common.value')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t('analysis.modelNameLabel'), modelName],
                  [t('analysis.testDate'), testDate],
                  [t('analysis.temperatureLabel'), `${temperature} \u00B0C`],
                  ['r\u2081', `${r1} mm`],
                  ['r\u2082', `${r2} mm`],
                  [t('analysis.amplitudeA1'), `${results.amplitudeA1.toFixed(4)} mW`],
                  [t('analysis.amplitudeA2'), `${results.amplitudeA2.toFixed(4)} mW`],
                  [t('analysis.periodT'), `${results.periodT.toFixed(4)} s`],
                  [t('analysis.frequencyF'), `${results.frequencyF.toFixed(6)} Hz`],
                  [t('analysis.angularFreq'), `${results.angularFreqW.toFixed(6)} rad/s`],
                  [t('analysis.rawTimeLag'), `${results.rawLagDt.toFixed(4)} s`],
                  [t('analysis.rawPhase'), `${results.rawPhasePhi.toFixed(6)} rad`],
                  [t('analysis.lnTerm'), results.lnTerm.toFixed(6)],
                  [t('analysis.alphaCombinedRaw'), fmtAlpha(results.alphaCombinedRaw)],
                  [t('analysis.alphaPhaseRaw'), fmtAlpha(results.alphaPhaseRaw)],
                  [t('analysis.calibration'), useCalibration ? t('common.enabled') : t('common.disabled')],
                  ...(useCalibration
                    ? [
                        [t('analysis.systemLag'), `${systemLag.toFixed(1)} s`],
                        [t('analysis.netTimeLag'), `${results.netLagDt.toFixed(4)} s`],
                        [t('analysis.netPhase'), `${results.netPhasePhi.toFixed(6)} rad`],
                        [t('analysis.alphaCombinedCal'), fmtAlpha(results.alphaCombinedCal)],
                        [t('analysis.alphaPhaseCal'), fmtAlpha(results.alphaPhaseCal)],
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
              className="px-5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] font-semibold text-sm hover:border-accent hover:shadow-sm transition-all"
            >
              {t('common.downloadCsv')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isConfigured}
              className="px-5 py-2.5 rounded-lg bg-success text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? t('analysis.saving') : t('analysis.saveToDb')}
            </button>
            {!isConfigured && (
              <span className="text-xs text-[var(--text-muted)]">{t('analysis.supabaseNotConfiguredSaving')}</span>
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
