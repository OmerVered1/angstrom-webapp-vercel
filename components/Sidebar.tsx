'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const navItems = [
  { href: '/', icon: '🏠', key: 'sidebar.home' },
  { href: '/analysis', icon: '📊', key: 'sidebar.analysis' },
  { href: '/summary', icon: '📋', key: 'sidebar.summary' },
  { href: '/history', icon: '📁', key: 'sidebar.history' },
  { href: '/statistics', icon: '📈', key: 'sidebar.statistics' },
  { href: '/theory', icon: '📐', key: 'sidebar.theory' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="w-72 min-h-screen flex flex-col border-e border-[var(--border)] bg-[var(--bg-secondary)] p-0">
      {/* Logo */}
      <div className="flex justify-center p-2 -mx-1">
        <Image
          src="/sidebar_icon.png"
          alt="Fire Wave Mascot"
          width={260}
          height={210}
          className="object-contain"
          priority
        />
      </div>

      {/* Dark mode + Language toggles */}
      <div className="px-4 pb-2 space-y-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <hr className="border-[var(--border)]" />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <h2 className="text-xl font-bold mb-3">{t('common.navigation')}</h2>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors
                  ${pathname === item.href
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {item.icon} {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

    </aside>
  )
}
