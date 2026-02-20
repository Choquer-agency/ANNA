import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { ConvexClientProvider } from '@/components/auth/ConvexAuthProvider'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Anna — AI Voice Dictation for macOS',
  description:
    'AI-powered voice dictation for macOS. Press a shortcut, speak naturally, and watch polished text appear anywhere you type.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Anna — AI Voice Dictation for macOS',
    description:
      'Press a shortcut, speak naturally, and watch polished text appear anywhere you type.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Anna',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anna — AI Voice Dictation for macOS',
    description:
      'Press a shortcut, speak naturally, and watch polished text appear anywhere you type.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased bg-surface text-ink">
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
