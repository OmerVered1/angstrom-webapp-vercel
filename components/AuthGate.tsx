'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    const stored = sessionStorage.getItem('authenticated')
    if (stored === 'true') setAuthenticated(true)
    setChecking(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      sessionStorage.setItem('authenticated', 'true')
      setAuthenticated(true)
    } else {
      setError(t('auth.error'))
    }
  }

  if (checking) return null

  if (authenticated) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 space-y-6">
        <div className="flex justify-center">
          <Image
            src="/sidebar_icon.png"
            alt="Logo"
            width={180}
            height={145}
            className="object-contain"
            priority
          />
        </div>

        <hr className="border-[var(--border)]" />

        <div>
          <label className="block text-lg font-bold mb-2">{t('auth.title')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.placeholder')}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
        >
          {t('auth.submit')}
        </button>
      </form>
    </div>
  )
}
