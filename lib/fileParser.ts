/**
 * File parser for Keithley and C80 instrument data files.
 * Ported from analysis.py – handles CSV/TSV/XLS text formats.
 *
 * Note: Excel binary parsing (.xls/.xlsx) is NOT supported in the
 * browser.  Users must export to CSV/TSV before uploading.  The
 * Streamlit version used pandas for binary Excel; here we handle
 * text-based exports only.
 */

export interface ParsedData {
  time: number[]
  value: number[]
}

export type FileType = 'keithley' | 'c80' | 'unknown'

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

/**
 * Decode raw bytes to string, trying multiple encodings.
 * In the browser we rely on TextDecoder which supports UTF-8 and UTF-16.
 */
function decodeBytes(content: ArrayBuffer): string {
  const bytes = new Uint8Array(content)

  // Detect BOM
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(content)
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(content)
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(content)
  }

  // Default: UTF-8
  return new TextDecoder('utf-8').decode(content)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse uploaded file content into time/value arrays.
 * Equivalent to `clean_read` in the Python version.
 */
export function parseFile(content: ArrayBuffer, filename: string): ParsedData | null {
  const text = decodeBytes(content)
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return null

  const format = detectFormat(lines)

  if (format === 'keithley') return parseKeithley(lines)
  if (format === 'c80') return parseC80(lines)

  // Fallback: try both parsers then generic
  let result = parseC80(lines)
  if (result) return result
  result = parseKeithley(lines)
  if (result) return result
  return parseGeneric(lines)
}

/**
 * Detect whether the file is Keithley, C80, or unknown.
 */
export function detectFileType(content: ArrayBuffer, filename: string): FileType {
  if (/\.xlsx?$/i.test(filename)) return 'c80'

  const text = decodeBytes(content)
  return detectFormat(text.split(/\r?\n/))
}

/**
 * Extract instrument start time from file header.
 * Returns HH:MM:SS string or null.
 */
export function extractStartTime(content: ArrayBuffer, filename: string): string | null {
  const text = decodeBytes(content)
  const lines = text.split(/\r?\n/).slice(0, 40)

  for (const line of lines) {
    const lower = line.toLowerCase()

    // C80: "Zone Start Time : 16/02/2026 12:52:04"
    if (lower.includes('zone start time')) {
      const m = line.match(/(\d{1,2}:\d{2}:\d{2})/)
      if (m) return m[1]
    }

    // Keithley: "# Started: 2026-02-16 14:48:43"
    if (line.trim().startsWith('#') && lower.includes('started')) {
      const m = line.match(/(\d{1,2}:\d{2}:\d{2})/)
      if (m) return m[1]
    }
  }

  // Generic fallback
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('creation') || lower.includes('user')) continue
    if (/start time|begin|started/i.test(lower)) {
      const m = line.match(/(\d{1,2}:\d{2}:\d{2})/)
      if (m) return m[1]
    }
  }

  return null
}

/**
 * Extract test date from filename → DD/MM/YYYY or null.
 */
export function extractDateFromFilename(filename: string): string | null {
  const basename = filename.replace(/\.[^.]+$/, '').replace(/^.*[\\/]/, '')

  // DDMMYY (6 digits)
  let m = basename.match(/(\d{2})(\d{2})(\d{2})(?:\D|$)/)
  if (m) {
    const [, dd, mm, yy] = m
    const year = `20${yy}`
    if (isValidDate(dd, mm, year)) return `${dd}/${mm}/${year}`
  }

  // DD-MM-YY / DD.MM.YY / DD_MM_YY
  m = basename.match(/(\d{2})[.\-_](\d{2})[.\-_](\d{2,4})/)
  if (m) {
    const [, dd, mm, rawYY] = m
    const year = rawYY.length === 2 ? `20${rawYY}` : rawYY
    if (isValidDate(dd, mm, year)) return `${dd}/${mm}/${year}`
  }

  // YYYY-MM-DD
  m = basename.match(/(\d{4})[.\-_](\d{2})[.\-_](\d{2})/)
  if (m) {
    const [, yyyy, mm, dd] = m
    if (isValidDate(dd, mm, yyyy)) return `${dd}/${mm}/${yyyy}`
  }

  return null
}

/**
 * Extract temperature (°C) from filename or null.
 */
export function extractTemperatureFromFilename(filename: string): number | null {
  const basename = filename.replace(/\.[^.]+$/, '').replace(/^.*[\\/]/, '').toLowerCase()
  const valid = (v: number) => v >= -50 && v <= 500

  let m = basename.match(/(\d+(?:\.\d+)?)\s*°?c(?:\s|$|[^a-z])/)
  if (m && valid(Number(m[1]))) return Number(m[1])

  m = basename.match(/(?:temp|t)[\s_-]*(\d+(?:\.\d+)?)/)
  if (m && valid(Number(m[1]))) return Number(m[1])

  m = basename.match(/(\d+(?:\.\d+)?)\s*(?:deg|degrees)/)
  if (m && valid(Number(m[1]))) return Number(m[1])

  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isValidDate(dd: string, mm: string, yyyy: string): boolean {
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  return (
    d.getFullYear() === Number(yyyy) &&
    d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd)
  )
}

function detectFormat(lines: string[]): FileType {
  const header = lines.slice(0, 15).join('\n').toLowerCase()

  if (header.includes('# run') || header.includes('elapsed(s)') || header.includes('power(w)')) {
    return 'keithley'
  }
  if (header.includes('heatflow') || (header.includes('time(s)') && header.includes('temperature'))) {
    return 'c80'
  }
  return 'unknown'
}

function parseKeithley(lines: string[]): ParsedData | null {
  const data: [number, number][] = []
  let timeCol: number | null = null
  let powerCol: number | null = null
  let started = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const row = trimmed.split(',').map(s => s.trim())

    if (!started) {
      const lower = row.map(s => s.toLowerCase())
      for (let i = 0; i < lower.length; i++) {
        if (/elapsed.*s\)|sec/.test(lower[i]) && timeCol === null) timeCol = i
        else if (/power.*w\)|watt/.test(lower[i])) powerCol = i
      }
      if (timeCol !== null && powerCol !== null) {
        started = true
        continue
      }
      continue
    }

    if (timeCol !== null && powerCol !== null && row.length > Math.max(timeCol, powerCol)) {
      const t = parseFloat(row[timeCol])
      const v = parseFloat(row[powerCol])
      if (!isNaN(t) && !isNaN(v)) data.push([t, v])
    }
  }

  return data.length > 10 ? { time: data.map(d => d[0]), value: data.map(d => d[1]) } : null
}

function parseC80(lines: string[]): ParsedData | null {
  const data: [number, number][] = []
  let timeCol: number | null = null
  let powerCol: number | null = null
  let started = false
  let delimiter = '\t'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect delimiter
    if (!started) {
      if (trimmed.includes('\t')) delimiter = '\t'
      else if (trimmed.includes(',')) delimiter = ','
      else if (trimmed.includes(';')) delimiter = ';'
    }

    let row = trimmed.split(delimiter).map(s => s.trim())

    // If only 1 column, try other delimiters
    if (row.length <= 1 && !started) {
      for (const d of ['\t', ',', ';']) {
        const test = trimmed.split(d).map(s => s.trim())
        if (test.length > 1) {
          row = test
          delimiter = d
          break
        }
      }
    }

    if (!started) {
      const lower = row.map(s => s.toLowerCase())
      for (let i = 0; i < lower.length; i++) {
        if (/time.*s\)|sec|^time$/.test(lower[i]) && timeCol === null) timeCol = i
        else if (/heatflow|heat flow|heat_flow/.test(lower[i])) powerCol = i
      }
      if (timeCol !== null && powerCol !== null) {
        started = true
        continue
      }
      continue
    }

    if (timeCol !== null && powerCol !== null && row.length > Math.max(timeCol, powerCol)) {
      const t = parseFloat(row[timeCol].replace(',', '.'))
      const v = parseFloat(row[powerCol].replace(',', '.'))
      if (!isNaN(t) && !isNaN(v)) data.push([t, v])
    }
  }

  return data.length > 10 ? { time: data.map(d => d[0]), value: data.map(d => d[1]) } : null
}

function parseGeneric(lines: string[]): ParsedData | null {
  const data: [number, number][] = []

  for (const line of lines) {
    const row = line.trim().split(/[,\t;]/)
    if (row.length >= 2) {
      const t = parseFloat(row[0].replace(/"/g, '').trim())
      const v = parseFloat(row[1].replace(/"/g, '').trim())
      if (!isNaN(t) && !isNaN(v)) data.push([t, v])
    }
  }

  return data.length > 10 ? { time: data.map(d => d[0]), value: data.map(d => d[1]) } : null
}
