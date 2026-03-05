/**
 * Peak detection for thermal wave signals.
 * Ported from scipy.signal.find_peaks logic + custom helpers in analysis.py.
 *
 * We implement a simple "local-maximum with minimum distance" algorithm
 * that mirrors scipy's `find_peaks(x, distance=d)` behaviour – no
 * external dependency required.
 */

// ---------------------------------------------------------------------------
// Core peak finder
// ---------------------------------------------------------------------------

/**
 * Find local maxima in `values` that are separated by at least `distance` samples.
 * Returns an array of indices where peaks occur.
 *
 * Equivalent to `scipy.signal.find_peaks(values, distance=distance)`.
 */
export function findPeaks(values: number[], distance: number): number[] {
  if (values.length < 3) return []

  // Step 1: find ALL local maxima (value[i] > value[i-1] AND value[i] > value[i+1])
  const candidates: number[] = []
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] >= values[i + 1]) {
      candidates.push(i)
    }
  }

  if (candidates.length === 0) return []
  if (distance <= 1) return candidates

  // Step 2: enforce minimum distance — keep strongest peaks
  // Sort candidates by amplitude (descending) to prioritise taller peaks
  const sorted = [...candidates].sort((a, b) => values[b] - values[a])
  const keep = new Set<number>()
  const suppressed = new Set<number>()

  for (const idx of sorted) {
    if (suppressed.has(idx)) continue
    keep.add(idx)
    // Suppress neighbours within `distance`
    for (const other of sorted) {
      if (other !== idx && Math.abs(other - idx) < distance) {
        suppressed.add(other)
      }
    }
  }

  // Return in original order (ascending index)
  return candidates.filter(i => keep.has(i))
}

// ---------------------------------------------------------------------------
// High-level helpers (match analysis.py API)
// ---------------------------------------------------------------------------

/**
 * Automatically detect peaks in a signal.
 * `minDistanceFraction` controls the minimum peak spacing as a fraction of total length.
 */
export function autoDetectPeaks(
  time: number[],
  values: number[],
  minDistanceFraction = 0.05,
): { indices: number[]; times: number[] } {
  const distance = Math.max(Math.floor(values.length * minDistanceFraction), 10)
  const indices = findPeaks(values, distance)
  const times = indices.map(i => time[i])
  return { indices, times }
}

/**
 * Snap a user-clicked time coordinate to the nearest actual peak within a window.
 * Returns { time, value, index }.
 */
export function snapToPeak(
  clickTime: number,
  time: number[],
  values: number[],
  windowSamples = 50,
): { time: number; value: number; index: number } {
  // Find closest index to the click time
  let closestIdx = 0
  let closestDist = Infinity
  for (let i = 0; i < time.length; i++) {
    const d = Math.abs(time[i] - clickTime)
    if (d < closestDist) {
      closestDist = d
      closestIdx = i
    }
  }

  // Search for local max within window
  const start = Math.max(0, closestIdx - windowSamples)
  const end = Math.min(values.length, closestIdx + windowSamples)

  let maxIdx = start
  for (let i = start; i < end; i++) {
    if (values[i] > values[maxIdx]) maxIdx = i
  }

  return { time: time[maxIdx], value: values[maxIdx], index: maxIdx }
}
