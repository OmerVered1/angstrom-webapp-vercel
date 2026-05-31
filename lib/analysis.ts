/**
 * Core analysis engine for Angstrom-method thermal diffusivity.
 * Ported from analysis.py — all math runs client-side.
 */

import { findPeaks, snapToPeak, computeCycleAmplitude } from './peakDetection'
import { extractFourierFundamental, filterToRange, detectSquarePeriod } from './squareAnalysis'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalysisParams {
  modelName: string
  testDate: string
  testTime: string
  tCal: string   // C80 start time HH:MM:SS
  tSrc: string   // Keithley start time HH:MM:SS
  r1Mm: number   // inner radius (mm)
  r2Mm: number   // outer radius (mm)
  c80TimeUnit: TimeUnit
  c80PwrUnit: PowerUnit
  srcTimeUnit: TimeUnit
  srcPwrUnit: PowerUnit
  useCalibration: boolean
  systemLag: number   // seconds
  analysisMode: AnalysisMode
  // Optional manual period override (s) for AutoFFT mode; 0/undefined → auto-detect
  fftPeriodOverride?: number
}

export type AnalysisMode = 'Auto' | 'AutoHybrid' | 'AutoFFT' | 'Manual'

export interface AnalysisResults {
  amplitudeA1: number
  amplitudeA2: number
  periodT: number
  frequencyF: number
  periodTResp: number | null
  frequencyFResp: number | null
  angularFreqW: number
  rawLagDt: number
  rawPhasePhi: number
  lnTerm: number
  alphaCombinedRaw: number
  alphaCombinedCal: number
  alphaPhaseRaw: number
  alphaPhaseCal: number
  netLagDt: number
  netPhasePhi: number
  tMin: number
  tMax: number
  markerSrcTime: number
  markerSrc2Time: number
  markerCalTime: number
  meanPeakSrc: number
  meanTroughSrc: number
  meanPeakCal: number
  meanTroughCal: number
}

export type TimeUnit = 'Seconds' | 'Minutes' | 'Hours' | 'ms'
export type PowerUnit = 'mW' | 'Watts' | 'uW'

// ---------------------------------------------------------------------------
// Unit conversion factors
// ---------------------------------------------------------------------------

const TIME_FACTORS: Record<TimeUnit, number> = {
  Seconds: 1,
  Minutes: 60,
  Hours: 3600,
  ms: 0.001,
}

const POWER_FACTORS: Record<PowerUnit, number> = {
  mW: 1,
  Watts: 1000,
  uW: 0.001,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hhmmssToSeconds(hms: string): number {
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s
}

function arrayMin(a: number[]): number {
  let v = Infinity
  for (const x of a) if (x < v) v = x
  return v
}

function arrayMax(a: number[]): number {
  let v = -Infinity
  for (const x of a) if (x > v) v = x
  return v
}

function meanDiff(arr: number[]): number {
  let sum = 0
  for (let i = 1; i < arr.length; i++) sum += arr[i] - arr[i - 1]
  return sum / (arr.length - 1)
}

function meanOfIndices(values: number[], indices: number[]): number {
  if (indices.length === 0) return 0
  let sum = 0
  for (const i of indices) sum += values[i]
  return sum / indices.length
}

/** Average of the minimum values found between each pair of consecutive peaks. */
function meanTroughBetweenPeaks(values: number[], peakIndices: number[]): number {
  if (peakIndices.length < 2) return arrayMin(values)
  let sum = 0
  for (let k = 0; k < peakIndices.length - 1; k++) {
    let minVal = values[peakIndices[k]]
    for (let i = peakIndices[k] + 1; i < peakIndices[k + 1]; i++) {
      if (values[i] < minVal) minVal = values[i]
    }
    sum += minVal
  }
  return sum / (peakIndices.length - 1)
}

// ---------------------------------------------------------------------------
// Sync & filter
// ---------------------------------------------------------------------------

export interface SyncedData {
  tSrc: number[]
  vSrc: number[]
  tCal: number[]
  vCal: number[]
}

/**
 * Apply unit conversions, synchronise clocks, and filter to overlapping region.
 */
export function syncAndFilterData(
  calTime: number[],
  calValue: number[],
  srcTime: number[],
  srcValue: number[],
  params: AnalysisParams,
): SyncedData {
  // Unit conversions
  const ctf = TIME_FACTORS[params.c80TimeUnit]
  const cpf = POWER_FACTORS[params.c80PwrUnit]
  const stf = TIME_FACTORS[params.srcTimeUnit]
  const spf = POWER_FACTORS[params.srcPwrUnit]

  const tCalRaw = calTime.map(t => t * ctf)
  const vCalRaw = calValue.map(v => v * cpf)
  const tSrcRaw = srcTime.map(t => t * stf)
  const vSrcAll = srcValue.map(v => v * spf)

  // Time offset between instruments
  const offset = hhmmssToSeconds(params.tSrc) - hhmmssToSeconds(params.tCal)
  const tSrcSync = tSrcRaw.map(t => t + offset)

  // Filter calorimeter data to overlapping region (±500 s margin)
  const srcMin = arrayMin(tSrcSync) - 500
  const srcMax = arrayMax(tSrcSync) + 500

  const tCal: number[] = []
  const vCal: number[] = []
  for (let i = 0; i < tCalRaw.length; i++) {
    if (tCalRaw[i] >= srcMin && tCalRaw[i] <= srcMax) {
      tCal.push(tCalRaw[i])
      vCal.push(vCalRaw[i])
    }
  }

  return { tSrc: tSrcSync, vSrc: vSrcAll, tCal, vCal }
}

// ---------------------------------------------------------------------------
// Automatic analysis
// ---------------------------------------------------------------------------

/**
 * Run automatic analysis using peak detection.
 */
export function runAutoAnalysis(
  tCal: number[],
  vCal: number[],
  tSrc: number[],
  vSrc: number[],
  params: AnalysisParams,
  tMin: number,
  tMax: number,
): AnalysisResults {
  // Use large distance (~1/8 of data) to avoid detecting noise between real peaks
  const peaksSrc = findPeaks(vSrc, Math.max(Math.floor(vSrc.length / 8), 10))
  const peaksCal = findPeaks(vCal, Math.max(Math.floor(vCal.length / 8), 10))

  // Filter out noise: only keep peaks above 60% of range
  const srcMin = arrayMin(vSrc), srcMax = arrayMax(vSrc)
  const srcThreshold = srcMin + (srcMax - srcMin) * 0.6
  const strongSrc = peaksSrc.filter(i => vSrc[i] >= srcThreshold)

  const calMin = arrayMin(vCal), calMax = arrayMax(vCal)
  const calThreshold = calMin + (calMax - calMin) * 0.6
  const strongCal = peaksCal.filter(i => vCal[i] >= calThreshold)

  if (strongSrc.length < 2 || strongCal.length < 1) {
    throw new Error('Not enough peaks detected. Try manual mode or adjust the selection range.')
  }

  // Period from source peaks
  const peakTimesSrc = strongSrc.map(i => tSrc[i])
  const T = meanDiff(peakTimesSrc)
  const w = (2 * Math.PI) / T

  // Response period (diagnostic): mean diff between response peaks, if enough peaks
  const tResp = strongCal.length >= 2 ? meanDiff(strongCal.map(i => tCal[i])) : null

  // Time lag between first source and first response peak
  let tsFirst = tSrc[strongSrc[0]]
  let tsSecond = tSrc[strongSrc[1]]
  let tcFirst = tCal[strongCal[0]]
  let dt = tcFirst - tsFirst

  // Response peak should be between the two source peaks
  if (dt < 0 && strongCal.length > 1) {
    tcFirst = tCal[strongCal[1]]
    dt = tcFirst - tsFirst
  }

  // Amplitudes — per-cycle averaging for robustness against drift/transients
  const a1 = computeCycleAmplitude(vSrc, strongSrc)
  const a2 = computeCycleAmplitude(vCal, strongCal)

  // Mean peak/trough levels for visualization — only use troughs between consecutive peaks
  const result = calculateThermalDiffusivity(a1, a2, T, w, dt, params, tMin, tMax, tsFirst, tsSecond, tcFirst)
  result.periodTResp = tResp && isFinite(tResp) && tResp > 0 ? tResp : null
  result.frequencyFResp = result.periodTResp ? 1 / result.periodTResp : null
  result.meanPeakSrc = meanOfIndices(vSrc, strongSrc)
  result.meanTroughSrc = meanTroughBetweenPeaks(vSrc, strongSrc)
  result.meanPeakCal = meanOfIndices(vCal, strongCal)
  result.meanTroughCal = meanTroughBetweenPeaks(vCal, strongCal)
  return result
}

// ---------------------------------------------------------------------------
// Manual analysis
// ---------------------------------------------------------------------------

/**
 * Run manual analysis using user-selected peak positions.
 * `clicks` = [[t1_src, v1], [t2_src, v2], [t1_cal, v1]]
 */
export function runManualAnalysis(
  tCal: number[],
  vCal: number[],
  tSrc: number[],
  vSrc: number[],
  params: AnalysisParams,
  tMin: number,
  tMax: number,
  clicks: [number, number][],
): AnalysisResults {
  if (clicks.length < 3) throw new Error('Need 3 click coordinates for manual analysis')

  const p1 = snapToPeak(clicks[0][0], tSrc, vSrc)
  const p2 = snapToPeak(clicks[1][0], tSrc, vSrc)
  const p3 = snapToPeak(clicks[2][0], tCal, vCal)

  const T = Math.abs(p2.time - p1.time)
  const w = (2 * Math.PI) / T
  const dt = p3.time - p1.time

  // Amplitudes — per-cycle averaging (same logic as auto mode)
  const distSrc = Math.max(Math.floor(vSrc.length / 8), 10)
  const distCal = Math.max(Math.floor(vCal.length / 8), 10)
  const srcPeaks = findPeaks(vSrc, distSrc)
  const calPeaks = findPeaks(vCal, distCal)
  const srcThresh = arrayMin(vSrc) + (arrayMax(vSrc) - arrayMin(vSrc)) * 0.6
  const calThresh = arrayMin(vCal) + (arrayMax(vCal) - arrayMin(vCal)) * 0.6
  const strongSrcM = srcPeaks.filter(i => vSrc[i] >= srcThresh)
  const strongCalM = calPeaks.filter(i => vCal[i] >= calThresh)
  const useSrcPeaks = strongSrcM.length >= 2 ? strongSrcM : srcPeaks
  const useCalPeaks = strongCalM.length >= 1 ? strongCalM : calPeaks
  const a1 = computeCycleAmplitude(vSrc, useSrcPeaks)
  const a2 = computeCycleAmplitude(vCal, useCalPeaks)

  // Response period (diagnostic): auto-detect from response peaks, independent of clicks
  const tResp = useCalPeaks.length >= 2 ? meanDiff(useCalPeaks.map(i => tCal[i])) : null

  // Mean peak/trough levels for visualization — only troughs between consecutive peaks
  const result = calculateThermalDiffusivity(a1, a2, T, w, dt, params, tMin, tMax, p1.time, p2.time, p3.time)
  result.periodTResp = tResp && isFinite(tResp) && tResp > 0 ? tResp : null
  result.frequencyFResp = result.periodTResp ? 1 / result.periodTResp : null
  result.meanPeakSrc = meanOfIndices(vSrc, useSrcPeaks)
  result.meanTroughSrc = meanTroughBetweenPeaks(vSrc, useSrcPeaks)
  result.meanPeakCal = meanOfIndices(vCal, useCalPeaks)
  result.meanTroughCal = meanTroughBetweenPeaks(vCal, useCalPeaks)
  return result
}

// ---------------------------------------------------------------------------
// Core thermal diffusivity
// ---------------------------------------------------------------------------

export function calculateThermalDiffusivity(
  a1: number,
  a2: number,
  T: number,
  w: number,
  dt: number,
  params: AnalysisParams,
  tMin: number,
  tMax: number,
  markerSrc: number,
  markerSrc2: number,
  markerCal: number,
): AnalysisResults {
  const r1 = params.r1Mm / 1000
  const r2 = params.r2Mm / 1000
  const dr = r2 - r1

  const phi = w * Math.abs(dt)

  if (a1 <= 0 || a2 <= 0 || r1 <= 0 || r2 <= 0) {
    throw new Error('Amplitudes and radii must be positive')
  }

  let lnArg = (a1 / a2) * Math.sqrt(r1 / r2)
  let lnVal = Math.log(lnArg)
  if (lnVal <= 0) lnVal = 1.0

  // Raw – combined method: α = ω(r2-r1)² / (2φ·ln)
  const alphaCombinedRaw = (w * dr * dr) / (2 * phi * lnVal)

  // Raw – phase-only method: α = (ω/2)·((r2-r1)/φ)²
  const alphaPhaseRaw = (w / 2) * (dr / phi) ** 2

  // Calibration
  const lag = params.useCalibration ? params.systemLag : 0
  const dtNet = Math.abs(dt) - lag
  const phiNet = dtNet > 0 ? w * dtNet : 0

  let alphaCombinedCal = -1
  let alphaPhaseCal = -1
  if (dtNet > 0 && phiNet > 0) {
    alphaCombinedCal = (w * dr * dr) / (2 * phiNet * lnVal)
    alphaPhaseCal = (w / 2) * (dr / phiNet) ** 2
  }

  return {
    amplitudeA1: a1,
    amplitudeA2: a2,
    periodT: T,
    frequencyF: 1 / T,
    periodTResp: null,
    frequencyFResp: null,
    angularFreqW: w,
    rawLagDt: Math.abs(dt),
    rawPhasePhi: phi,
    lnTerm: lnVal,
    alphaCombinedRaw,
    alphaCombinedCal,
    alphaPhaseRaw,
    alphaPhaseCal,
    netLagDt: dtNet,
    netPhasePhi: phiNet,
    tMin,
    tMax,
    markerSrcTime: markerSrc,
    markerSrc2Time: markerSrc2,
    markerCalTime: markerCal,
    meanPeakSrc: 0,
    meanTroughSrc: 0,
    meanPeakCal: 0,
    meanTroughCal: 0,
  }
}

// ---------------------------------------------------------------------------
// Robust auto-mode helpers (used by AutoHybrid and AutoFFT)
// ---------------------------------------------------------------------------

/** Subtract a least-squares linear trend (a + b*t) from `value`. */
function linearDetrend(time: number[], value: number[]): number[] {
  const n = value.length
  if (n < 2) return [...value]
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    sx += time[i]
    sy += value[i]
    sxx += time[i] * time[i]
    sxy += time[i] * value[i]
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return [...value]
  const b = (n * sxy - sx * sy) / denom
  const a = (sy - b * sx) / n
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = value[i] - (a + b * time[i])
  return out
}

/**
 * Estimate the fundamental period of a (sinusoidal-ish) signal by scanning
 * candidate frequencies and picking the one with the largest Fourier amplitude.
 * Candidate periods range from ~ window/(maxCycles) down to ~ window/2 (so the
 * window contains between 2 and maxCycles full periods).
 */
export function estimateFundamentalPeriod(
  time: number[],
  value: number[],
  opts: { maxCycles?: number; gridSize?: number } = {},
): number | null {
  if (time.length < 8 || value.length !== time.length) return null
  const t0 = time[0]
  const tN = time[time.length - 1]
  const L = tN - t0
  if (L <= 0) return null

  const maxCycles = opts.maxCycles ?? 20
  const grid = opts.gridSize ?? 80
  const fMin = 2 / L          // 2 cycles in window
  const fMax = maxCycles / L  // up to maxCycles in window

  let bestFreq = fMin
  let bestAmp = -1
  // Logarithmic scan
  for (let i = 0; i < grid; i++) {
    const frac = i / (grid - 1)
    const freq = fMin * Math.pow(fMax / fMin, frac)
    const { amplitude } = extractFourierFundamental(time, value, freq)
    if (amplitude > bestAmp) {
      bestAmp = amplitude
      bestFreq = freq
    }
  }
  // One refine pass around the best (linear, finer)
  const refineRange = (fMax - fMin) / grid
  const f0 = Math.max(fMin, bestFreq - refineRange)
  const f1 = Math.min(fMax, bestFreq + refineRange)
  for (let i = 0; i < grid; i++) {
    const freq = f0 + (f1 - f0) * (i / (grid - 1))
    const { amplitude } = extractFourierFundamental(time, value, freq)
    if (amplitude > bestAmp) {
      bestAmp = amplitude
      bestFreq = freq
    }
  }
  return bestFreq > 0 ? 1 / bestFreq : null
}

/** Mean sample spacing of `time`. */
function meanDt(time: number[]): number {
  if (time.length < 2) return 1
  return (time[time.length - 1] - time[0]) / (time.length - 1)
}

/**
 * Pair each source peak with the closest response peak in (t_src, t_src + T*0.6]
 * and return the median lag. Returns null if no pairs are found.
 */
function medianPairwiseLag(
  tSrc: number[], srcPeakIdx: number[],
  tCal: number[], calPeakIdx: number[],
  T: number,
): number | null {
  const lags: number[] = []
  const calTimes = calPeakIdx.map(i => tCal[i])
  const window = T * 0.6
  for (const si of srcPeakIdx) {
    const ts = tSrc[si]
    let bestDt: number | null = null
    for (const tc of calTimes) {
      const dt = tc - ts
      if (dt > 0 && dt <= window) {
        if (bestDt == null || dt < bestDt) bestDt = dt
      }
    }
    if (bestDt != null) lags.push(bestDt)
  }
  if (lags.length === 0) return null
  lags.sort((a, b) => a - b)
  const mid = Math.floor(lags.length / 2)
  return lags.length % 2 === 0 ? (lags[mid - 1] + lags[mid]) / 2 : lags[mid]
}

// ---------------------------------------------------------------------------
// Auto (Peaks + FFT) — A+B+C from the design discussion
// ---------------------------------------------------------------------------

export function runAutoHybridAnalysis(
  tCal: number[],
  vCal: number[],
  tSrc: number[],
  vSrc: number[],
  params: AnalysisParams,
  tMin: number,
  tMax: number,
): AnalysisResults {
  const src = filterToRange(tSrc, vSrc, tMin, tMax)
  const cal = filterToRange(tCal, vCal, tMin, tMax)
  if (src.t.length < 20 || cal.t.length < 20) {
    throw new Error('Selected region has too few samples for hybrid analysis.')
  }

  // (C) Linear detrend before thresholding/peak detection
  const vSrcD = linearDetrend(src.t, src.v)
  const vCalD = linearDetrend(cal.t, cal.v)

  // (A) Estimate fundamental period from source via FFT scan,
  //     then set min peak distance from it.
  const Test = estimateFundamentalPeriod(src.t, vSrcD)
  if (!Test || !isFinite(Test) || Test <= 0) {
    throw new Error('Could not estimate fundamental period via FFT. Try a wider region.')
  }
  const dtSrc = meanDt(src.t)
  const dtCal = meanDt(cal.t)
  const minDistSrc = Math.max(Math.floor((0.7 * Test) / dtSrc), 3)
  const minDistCal = Math.max(Math.floor((0.7 * Test) / dtCal), 3)

  const peaksSrc = findPeaks(vSrcD, minDistSrc)
  const peaksCal = findPeaks(vCalD, minDistCal)

  // Threshold at 60% of post-detrend range
  let sMin = Infinity, sMax = -Infinity
  for (const v of vSrcD) { if (v < sMin) sMin = v; if (v > sMax) sMax = v }
  let cMin = Infinity, cMax = -Infinity
  for (const v of vCalD) { if (v < cMin) cMin = v; if (v > cMax) cMax = v }
  const srcThr = sMin + (sMax - sMin) * 0.6
  const calThr = cMin + (cMax - cMin) * 0.6
  const strongSrc = peaksSrc.filter(i => vSrcD[i] >= srcThr)
  const strongCal = peaksCal.filter(i => vCalD[i] >= calThr)

  if (strongSrc.length < 2 || strongCal.length < 1) {
    throw new Error('Not enough strong peaks after detrend. Widen the region or check the data.')
  }

  // Period from median of source peak-to-peak intervals
  const srcTimes = strongSrc.map(i => src.t[i])
  const srcDiffs: number[] = []
  for (let i = 1; i < srcTimes.length; i++) srcDiffs.push(srcTimes[i] - srcTimes[i - 1])
  srcDiffs.sort((a, b) => a - b)
  const T = srcDiffs.length % 2 === 0
    ? (srcDiffs[srcDiffs.length / 2 - 1] + srcDiffs[srcDiffs.length / 2]) / 2
    : srcDiffs[Math.floor(srcDiffs.length / 2)]
  const w = (2 * Math.PI) / T

  // (B) Median pairwise lag instead of first-peak lag
  const dt = medianPairwiseLag(src.t, strongSrc, cal.t, strongCal, T)
  if (dt == null) {
    throw new Error('Could not pair source/response peaks. Try widening the region.')
  }

  // Amplitudes on the detrended signal — per-cycle averaging
  const a1 = computeCycleAmplitude(vSrcD, strongSrc)
  const a2 = computeCycleAmplitude(vCalD, strongCal)

  // Response period (diagnostic) — median of response peak intervals
  let tResp: number | null = null
  if (strongCal.length >= 2) {
    const calTimes = strongCal.map(i => cal.t[i])
    const calDiffs: number[] = []
    for (let i = 1; i < calTimes.length; i++) calDiffs.push(calTimes[i] - calTimes[i - 1])
    calDiffs.sort((a, b) => a - b)
    tResp = calDiffs.length % 2 === 0
      ? (calDiffs[calDiffs.length / 2 - 1] + calDiffs[calDiffs.length / 2]) / 2
      : calDiffs[Math.floor(calDiffs.length / 2)]
  }

  // Marker times for the plot: first two strong source peaks, and the
  // response peak that pairs with the first source peak.
  const tsFirst = src.t[strongSrc[0]]
  const tsSecond = src.t[strongSrc[1]]
  const tcMarker = tsFirst + dt

  const result = calculateThermalDiffusivity(a1, a2, T, w, dt, params, tMin, tMax, tsFirst, tsSecond, tcMarker)
  result.periodTResp = tResp && isFinite(tResp) && tResp > 0 ? tResp : null
  result.frequencyFResp = result.periodTResp ? 1 / result.periodTResp : null
  result.meanPeakSrc = computeCycleAmplitude(src.v, strongSrc) > 0
    ? src.v.reduce((s, v, i) => strongSrc.includes(i) ? s + v : s, 0) / strongSrc.length
    : 0
  result.meanPeakCal = strongCal.length > 0
    ? cal.v.reduce((s, v, i) => strongCal.includes(i) ? s + v : s, 0) / strongCal.length
    : 0
  return result
}

// ---------------------------------------------------------------------------
// Auto (FFT) — pure Fourier fundamental, no peak detection
// ---------------------------------------------------------------------------

export function runAutoFFTAnalysis(
  tCal: number[],
  vCal: number[],
  tSrc: number[],
  vSrc: number[],
  params: AnalysisParams,
  tMin: number,
  tMax: number,
): AnalysisResults {
  const src = filterToRange(tSrc, vSrc, tMin, tMax)
  const cal = filterToRange(tCal, vCal, tMin, tMax)
  if (src.t.length < 20 || cal.t.length < 20) {
    throw new Error('Selected region has too few samples for FFT analysis.')
  }

  // Period: explicit override wins, otherwise FFT-detect on source
  let T: number | null = params.fftPeriodOverride && params.fftPeriodOverride > 0
    ? params.fftPeriodOverride
    : estimateFundamentalPeriod(src.t, src.v)
  if (!T || !isFinite(T) || T <= 0) {
    throw new Error('Could not determine fundamental period via FFT. Enter it manually.')
  }
  const f = 1 / T
  const w = 2 * Math.PI * f

  const srcFFT = extractFourierFundamental(src.t, src.v, f)
  const calFFT = extractFourierFundamental(cal.t, cal.v, f)
  if (srcFFT.amplitude <= 0 || calFFT.amplitude <= 0) {
    throw new Error('Fourier amplitude is zero in source or response — check the data.')
  }

  // Phase lag: response phase relative to source. Normalise to (-π, π].
  let phaseDiff = srcFFT.phase - calFFT.phase
  while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI
  while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI
  const dt = phaseDiff / w

  // Response period (diagnostic): FFT on the response signal
  const tRespFFT = estimateFundamentalPeriod(cal.t, cal.v)
  const tResp = tRespFFT && isFinite(tRespFFT) && tRespFFT > 0 ? tRespFFT : null

  // Marker times: first up-crossing of source mid-level + one period, and src + dt for response
  const srcEdge = detectSquarePeriod(src.t, src.v) > 0
    ? src.t[0] // detectSquarePeriod uses crossings; use a rough first edge approx
    : src.t[0]
  // Use a robust first up-crossing of the src mean
  let mean = 0
  for (const v of src.v) mean += v
  mean /= src.v.length
  let firstEdge = src.t[0]
  for (let i = 1; i < src.v.length; i++) {
    if (src.v[i - 1] < mean && src.v[i] >= mean) {
      const frac = (mean - src.v[i - 1]) / (src.v[i] - src.v[i - 1])
      firstEdge = src.t[i - 1] + frac * (src.t[i] - src.t[i - 1])
      break
    }
  }
  // Silence unused-var warning while keeping the early calc available
  void srcEdge

  const result = calculateThermalDiffusivity(
    srcFFT.amplitude,
    calFFT.amplitude,
    T,
    w,
    Math.abs(dt),
    params,
    tMin,
    tMax,
    firstEdge,
    firstEdge + T,
    firstEdge + Math.abs(dt),
  )
  result.periodTResp = tResp
  result.frequencyFResp = tResp ? 1 / tResp : null
  return result
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a thermal diffusivity value in scientific notation.
 */
export function formatScientific(value: number, precision = 2): string {
  if (value < 0) return 'N/A'
  return value.toExponential(precision)
}
