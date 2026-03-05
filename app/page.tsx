'use client'

import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { parseTestDate } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { HomeMetrics } from '@/lib/types'

export default function HomePage() {
  const { t } = useLanguage()
  const [metrics, setMetrics] = useState<HomeMetrics>({
    totalAnalyses: 0,
    uniqueModels: 0,
    latestTestDate: '—',
  })

  useEffect(() => {
    async function fetchMetrics() {
      if (!isConfigured) return

      const { data } = await supabase
        .from('analyses')
        .select('model_name, test_date')

      if (!data || data.length === 0) return

      const models = new Set(data.map((a) => a.model_name).filter(Boolean))

      const dated = data
        .filter((a) => a.test_date)
        .map((a) => ({ date: parseTestDate(a.test_date), str: a.test_date }))

      const latest = dated.length > 0
        ? dated.reduce((a, b) => (a.date > b.date ? a : b)).str
        : '—'

      setMetrics({
        totalAnalyses: data.length,
        uniqueModels: models.size,
        latestTestDate: latest,
      })
    }
    fetchMetrics()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black">{t('home.title')}</h1>
        <p className="text-[var(--text-muted)] max-w-3xl mx-auto">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard label={t('home.totalAnalyses')} value={metrics.totalAnalyses} />
        <MetricCard label={t('home.uniqueModels')} value={metrics.uniqueModels} />
        <MetricCard label={t('home.latestTestDate')} value={metrics.latestTestDate} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* How to use */}
      <div>
        <h2 className="text-2xl font-bold mb-4">{`🚀 ${t('home.howToUse')}`}</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
            <h3 className="font-bold text-lg mb-2">{`1️⃣ ${t('home.uploadData')}`}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t('home.uploadDataDesc')}
            </p>
          </div>
          <div className="rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
            <h3 className="font-bold text-lg mb-2">{`2️⃣ ${t('home.runAnalysis')}`}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t('home.runAnalysisDesc')}
            </p>
          </div>
          <div className="rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
            <h3 className="font-bold text-lg mb-2">{`3️⃣ ${t('home.saveExplore')}`}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t('home.saveExploreDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* What's inside */}
      <div>
        <h2 className="text-2xl font-bold mb-4">{`📦 ${t('home.whatsInside')}`}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <p><strong>{`📊 ${t('sidebar.analysis')}`}</strong> — {t('home.insideAnalysis')}</p>
            <p><strong>{`📋 ${t('sidebar.summary')}`}</strong> — {t('home.insideSummary')}</p>
            <p><strong>{`📁 ${t('sidebar.history')}`}</strong> — {t('home.insideHistory')}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>{`📈 ${t('sidebar.statistics')}`}</strong> — {t('home.insideStatistics')}</p>
            <p><strong>{`📐 ${t('sidebar.theory')}`}</strong> — {t('home.insideTheory')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
