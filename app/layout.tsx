import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Propilot AI — Copilote immobilier intelligent',
  description: 'Gérez votre patrimoine immobilier avec l\'IA. Suivi des loyers, fiscalité optimisée, copilote IA pour propriétaires multi-biens.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable} dark`}>
      <body className="min-h-screen bg-[#0B1628] text-slate-100 antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#111E35',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F1F5F9',
            },
          }}
        />
      </body>
    </html>
  )
}
