'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { href: '/', label: '🏠 Home' },
  { href: '/analysis', label: '📊 New Analysis' },
  { href: '/summary', label: '📋 Results Summary' },
  { href: '/history', label: '📁 Results History' },
  { href: '/statistics', label: '📈 Statistics' },
  { href: '/theory', label: '📐 Theory & Math' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 min-h-screen flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] p-0">
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

      {/* Dark mode toggle */}
      <div className="px-4 pb-2">
        <ThemeToggle />
      </div>

      <hr className="border-[var(--border)]" />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <h2 className="text-xl font-bold mb-3">Navigation</h2>
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
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

    </aside>
  )
}
