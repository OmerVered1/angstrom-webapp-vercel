'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage()
  const label = locale === 'en' ? 'עברית' : 'English'

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
      title={label}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <span className="text-lg">{locale === 'en' ? '🇮🇱' : '🇬🇧'}</span>
    </button>
  )
}
