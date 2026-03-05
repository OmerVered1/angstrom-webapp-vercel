import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'

export const metadata: Metadata = {
  title: 'Radial Heat Wave Analysis Research Toolkit',
  description: 'Thermal diffusivity measurement via the Angstrom method',
  icons: { icon: '/sidebar_icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthGate>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-8 overflow-auto flex flex-col">
                <div className="flex-1">{children}</div>
                <footer className="mt-8 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                  &copy; Omer Vered &middot; Hayun Group &middot; Ben Gurion University &middot; Built with Claude Code
                </footer>
              </main>
            </div>
          </AuthGate>
        </ThemeProvider>
      </body>
    </html>
  )
}
