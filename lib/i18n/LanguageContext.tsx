'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { Translations } from './types'
import { en } from './en'
import { he } from './he'

export type Locale = 'en' | 'he'

const locales: Record<Locale, Translations> = { en, he }

interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Read persisted locale on mount
  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale | null
    if (stored && locales[stored]) {
      setLocaleState(stored)
    }
  }, [])

  // Update <html lang dir> whenever locale changes
  useEffect(() => {
    const dir = locale === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }, [])

  const t = useCallback(
    (key: string): string => {
      const parts = key.split('.')
      if (parts.length !== 2) return key
      const [section, field] = parts
      const translations = locales[locale]
      const sec = translations[section as keyof Translations]
      if (sec && typeof sec === 'object' && field in sec) {
        return (sec as Record<string, string>)[field]
      }
      // Fallback to English
      const enSec = locales.en[section as keyof Translations]
      if (enSec && typeof enSec === 'object' && field in enSec) {
        return (enSec as Record<string, string>)[field]
      }
      return key
    },
    [locale],
  )

  const dir = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
