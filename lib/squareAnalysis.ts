/**
 * Square-wave analysis path. The thermal response to a square excitation is
 * a heavily damped wave dominated by the fundamental, so we extract amplitude
 * and phase at the fundamental frequency f₀ from BOTH signals via single-
 * frequency DFT and feed them into the same Ångström formula used for sine.
 */

import {
  calculateThermalDiffusivity,
  type AnalysisParams,
  type AnalysisResults,
} from './analysis'

/**
 * Detect the fundamental period of a square wave by finding rising edges
 * (upward crossings of the mid-level) and returning the mean spacing.
 * Returns NaN if fewer than 2 edges are detected.
 */
export function detectSquarePeriod(time: number[], value: number[]): number {
  if (value.length < 4) return NaN
  let vMin = Infinity, vMax = -Infinity
  for (const v of value) {
    if (v < vMin) vMin = v
    if (v > vMax) vMax = v
  }
  const mid = (vMin + vMax) / 2
  const edgeTimes: number[] = []
  for (let i = 1; i < value.length; i++) {
    if (value[i - 1] < mid && value[i] >= mid) {
      // Linear interpolation for sub-sample precision
      const frac = (mid - value[i - 1]) / (value[i] - value[i - 1])
      edgeTimes.push(time[i - 1] + frac * (time[i] - time[i - 1]))
    }
  }
  if (edgeTimes.length < 2) return NaN
  let sum = 0
  for (let i = 1; i < edgeTimes.length; i++) sum += edgeTimes[i] - edgeTimes[i - 1]
  return sum / (edgeTimes.length - 1)
}

/**
 * Single-frequency DFT: returns the amplitude and phase of the component at
 * `freq` (Hz) in the signal. Works on non-uniformly sampled data — uses the
 * actual time vector for trapezoidal-style integration via dt[i].
 *
 * Amplitude convention: half peak-to-peak of the fundamental sine component
 * (i.e. A in `A·cos(ωt − φ)`).
 */
export function extractFourierFundamental(
  time: number[],
  value: number[],
  freq: number,
): { amplitude: number; phase: number } {
  if (time.length < 2 || time.length !== value.length) {
    return { amplitude: 0, phase: 0 }
  }
  const omega = 2 * Math.PI * freq
  // Subtract DC mean to avoid leakage at f₀
  let mean = 0
  for (const v of value) mean += v
  mean /= value.length
  // Trapezoidal integration of (v - mean) * cos(ωt) and sin(ωt) over the window
  const tStart = time[0]
  const tEnd = time[time.length - 1]
  const L = tEnd - tStart
  if (L <= 0) return { amplitude: 0, phase: 0 }

  let cSum = 0
  let sSum = 0
  for (let i = 0; i < time.length - 1; i++) {
    const dt = time[i + 1] - time[i]
    const v0 = value[i] - mean
    const v1 = value[i + 1] - mean
    const c0 = v0 * Math.cos(omega * time[i])
    const c1 = v1 * Math.cos(omega * time[i + 1])
    const s0 = v0 * Math.sin(omega * time[i])
    const s1 = v1 * Math.sin(omega * time[i + 1])
    cSum += 0.5 * (c0 + c1) * dt
    sSum += 0.5 * (s0 + s1) * dt
  }
  const c = (2 / L) * cSum
  const s = (2 / L) * sSum
  return {
    amplitude: Math.sqrt(c * c + s * s),
    phase: Math.atan2(s, c),
  }
}

/**
 * Filter a (time, value) series to a [tMin, tMax] window.
 */
function filterToRange(
  time: number[],
  value: number[],
  tMin: number,
  tMax: number,
): { t: number[]; v: number[] } {
  const t: number[] = []
  const v: number[] = []
  for (let i = 0; i < time.length; i++) {
    if (time[i] >= tMin && time[i] <= tMax) {
      t.push(time[i])
      v.push(value[i])
    }
  }
  return { t, v }
}

/**
 * Run a square-wave analysis: extract fundamental amplitude/phase from both
 * signals, then feed into the existing Ångström α formula.
 */
export function runSquareAnalysis(
  tCal: number[],
  vCal: number[],
  tSrc: number[],
  vSrc: number[],
  params: AnalysisParams,
  tMin: number,
  tMax: number,
  periodOverride?: number,
): AnalysisResults {
  const src = filterToRange(tSrc, vSrc, tMin, tMax)
  const cal = filterToRange(tCal, vCal, tMin, tMax)

  if (src.t.length < 4 || cal.t.length < 4) {
    throw new Error('Not enough samples in the selected range for Fourier analysis.')
  }

  // Period: explicit override wins, otherwise auto-detect from source edges
  let period =
    periodOverride && periodOverride > 0 ? periodOverride : detectSquarePeriod(src.t, src.v)
  if (!isFinite(period) || period <= 0) {
    throw new Error('Could not determine the fundamental period — enter it manually.')
  }

  const freq = 1 / period
  const omega = 2 * Math.PI * freq

  const srcFFT = extractFourierFundamental(src.t, src.v, freq)
  const calFFT = extractFourierFundamental(cal.t, cal.v, freq)

  if (srcFFT.amplitude <= 0 || calFFT.amplitude <= 0) {
    throw new Error('Fourier amplitude is zero in source or response — check the data.')
  }

  // Phase lag: response lags source. Normalise difference to (-π, π].
  let phaseDiff = srcFFT.phase - calFFT.phase
  while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI
  while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI
  const lagDt = phaseDiff / omega

  // Plot markers: first rising edges of source give two natural references
  // for visual sanity-check (one period apart), and source-edge + lag for response.
  let srcMin = Infinity, srcMax = -Infinity
  for (const v of src.v) { if (v < srcMin) srcMin = v; if (v > srcMax) srcMax = v }
  const srcMid = (srcMin + srcMax) / 2
  let firstSrcEdge = src.t[0]
  for (let i = 1; i < src.v.length; i++) {
    if (src.v[i - 1] < srcMid && src.v[i] >= srcMid) {
      firstSrcEdge = src.t[i]
      break
    }
  }
  const secondSrcEdge = firstSrcEdge + period
  const respMarker = firstSrcEdge + lagDt

  // Response period (diagnostic): detect rising edges on the response signal
  const respPeriodRaw = detectSquarePeriod(cal.t, cal.v)
  const respPeriod = isFinite(respPeriodRaw) && respPeriodRaw > 0 ? respPeriodRaw : null

  const result = calculateThermalDiffusivity(
    srcFFT.amplitude,
    calFFT.amplitude,
    period,
    omega,
    lagDt,
    params,
    tMin,
    tMax,
    firstSrcEdge,
    secondSrcEdge,
    respMarker,
  )
  result.periodTResp = respPeriod
  result.frequencyFResp = respPeriod ? 1 / respPeriod : null
  return result
}
