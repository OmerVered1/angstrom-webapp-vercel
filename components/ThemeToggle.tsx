'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'
  const label = isDark ? t('theme.light') : t('theme.dark')

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
