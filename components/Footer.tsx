'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="mt-8 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
      {t('footer.copyright')}
    </footer>
  )
}
