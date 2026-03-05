import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'
import Footer from '@/components/Footer'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export const metadata: Metadata = {
  title: 'Radial Heat Wave Analysis Research Toolkit',
  description: 'Thermal diffusivity measurement via the Angstrom method',
  icons: { icon: '/sidebar_icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <AuthGate>
              <Sidebar />
              <main className="min-h-screen pt-20 px-6 pb-8 flex flex-col">
                <div className="flex-1">{children}</div>
                <Footer />
              </main>
            </AuthGate>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
