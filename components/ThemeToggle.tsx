'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-transform hover:scale-105
        dark:border-blue-400 dark:text-yellow-300
        border-gray-400 text-gray-700"
    >
      <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      <span className="font-semibold text-sm">{isDark ? 'Bright Mode' : 'Dark Mode'}</span>
    </button>
  )
}
