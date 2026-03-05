'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage()

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
      className="flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-transform hover:scale-105
        dark:border-blue-400 dark:text-yellow-300
        border-gray-400 text-gray-700"
    >
      <span className="text-lg">{locale === 'en' ? '🇮🇱' : '🇬🇧'}</span>
      <span className="font-semibold text-sm">
        {locale === 'en' ? 'עברית' : 'English'}
      </span>
    </button>
  )
}
