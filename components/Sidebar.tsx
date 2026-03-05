'use client'

import { useState, useEffect } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  // Close mobile menu on navigation
  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 h-full">
        {/* Start zone: Logo + title + hamburger on mobile */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center justify-center w-11 h-11 rounded-full bg-sky-100 dark:bg-sky-900/40 border-2 border-blue-600 dark:border-blue-400">
            <Image
              src="/sidebar_icon.png"
              alt="Fire Wave Mascot"
              width={60}
              height={48}
              className="object-contain h-9 w-auto"
              priority
            />
          </Link>

          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ms-2"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Center zone: Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-full text-base font-bold transition-colors
                ${pathname === item.href
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {item.icon} {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* End zone: Toggles */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="absolute top-14 inset-x-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] shadow-lg p-4 space-y-1 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-base font-bold transition-colors
                ${pathname === item.href
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {item.icon} {t(item.key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
