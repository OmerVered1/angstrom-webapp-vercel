'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { parseTestDate } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import type { HomeMetrics } from '@/lib/types'

export default function HomePage() {
  const [metrics, setMetrics] = useState<HomeMetrics>({
    totalAnalyses: 0,
    uniqueModels: 0,
    latestTestDate: '—',
  })

  useEffect(() => {
    async function fetchMetrics() {
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black">Radial Heat Wave Analysis Research Toolkit</h1>
        <p className="text-[var(--text-muted)] max-w-3xl mx-auto">
          Dynamic Method for Characterization of Thermal Diffusivity of Insulators by
          Modulated Analysis of Heat Waves Based on the Angstrom Method, a Thesis Research
          by Omer Vered, BGU
        </p>
      </div>

      <hr className="border-[var(--border)]" />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard label="Total Analyses" value={metrics.totalAnalyses} />
        <MetricCard label="Unique Models" value={metrics.uniqueModels} />
        <MetricCard label="Latest Test Date" value={metrics.latestTestDate} />
      </div>

      <hr className="border-[var(--border)]" />

      {/* How to use */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🚀 How to use</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="rounded-lg p-5 bg-[var(--bg-secondary)] border border-[var(--border)]">
            <h3 className="font-bold text-lg mb-2">1️⃣ Upload Data</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Go to <strong>New Analysis</strong>, upload your C80 and Keithley data files.
            </p>
          </div>
          <div className="rounded-lg p-5 bg-[var(--bg-secondary)] border border-[var(--border)]">
            <h3 className="font-bold text-lg mb-2">2️⃣ Run Analysis</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Select the steady-state region on the plot, then run the analysis.
            </p>
          </div>
          <div className="rounded-lg p-5 bg-[var(--bg-secondary)] border border-[var(--border)]">
            <h3 className="font-bold text-lg mb-2">3️⃣ Save & Explore</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Save results to the database, then explore trends in Statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
