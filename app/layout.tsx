import type { Metadata } from 'next'
import { Syne, DM_Sans, DM_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
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

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'Patrimo IA — Gérez votre patrimoine immobilier',
    template: '%s | Patrimo IA',
  },
  description: 'Le copilote IA pour propriétaires multi-biens. Loyers, baux, fiscalité LMNP/SCI/Airbnb, rentabilité — tout en un.',
  keywords: ['gestion locative', 'LMNP', 'SCI', 'immobilier', 'loyers', 'fiscalité immobilière', 'IA'],
  authors: [{ name: 'Patrimo IA' }],
  creator: 'Patrimo IA',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://patrimo.ai',
    siteName: 'Patrimo IA',
    title: 'Patrimo IA — Votre patrimoine, enfin clair.',
    description: 'Le copilote IA pour propriétaires multi-biens.',
    images: [{ url: '/logos/logo-dark.png', width: 543, height: 181 }],
  },
  twitter: {
    card: 'summary',
    title: 'Patrimo IA',
    description: 'Le copilote IA pour propriétaires multi-biens.',
    images: ['/logos/logo-dark.png'],
  },
  icons: {
    icon: '/logos/favicon.png',
    shortcut: '/logos/favicon.png',
    apple: '/logos/favicon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Patrimo IA',
  },
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Patrimo IA" />
        <link rel="apple-touch-icon" href="/logos/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1D4ED8" />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster theme="system" position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
