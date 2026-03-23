/**
 * Core analysis engine for Angstrom-method thermal diffusivity.
 * Ported from analysis.py — all math runs client-side.
 */

import { findPeaks, snapToPeak, computeCycleAmplitude } from './peakDetection'

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
  analysisMode: 'Auto' | 'Manual'
}

export interface AnalysisResults {
  amplitudeA1: number
  amplitudeA2: number
  periodT: number
  frequencyF: number
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

  // Mean peak/trough levels for visualization — only troughs between consecutive peaks
  const result = calculateThermalDiffusivity(a1, a2, T, w, dt, params, tMin, tMax, p1.time, p2.time, p3.time)
  result.meanPeakSrc = meanOfIndices(vSrc, useSrcPeaks)
  result.meanTroughSrc = meanTroughBetweenPeaks(vSrc, useSrcPeaks)
  result.meanPeakCal = meanOfIndices(vCal, useCalPeaks)
  result.meanTroughCal = meanTroughBetweenPeaks(vCal, useCalPeaks)
  return result
}

// ---------------------------------------------------------------------------
// Core thermal diffusivity
// ---------------------------------------------------------------------------

function calculateThermalDiffusivity(
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
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a thermal diffusivity value in scientific notation.
 */
export function formatScientific(value: number, precision = 2): string {
  if (value < 0) return 'N/A'
  return value.toExponential(precision)
}
