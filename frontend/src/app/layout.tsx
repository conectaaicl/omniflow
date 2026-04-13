import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ConditionalLayout from '@/components/ConditionalLayout'
import { BrandingProvider } from '@/components/providers/BrandingProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OmniFlow — CRM Omnicanal con IA para Chile',
  description: 'Automatiza WhatsApp, Instagram, Facebook Messenger, TikTok y Email con IA. Bot que responde solo, CRM integrado y n8n incluido. Prueba gratis 14 días.',
  keywords: 'automatización whatsapp chile, bot whatsapp empresa, crm omnicanal chile, automatización instagram chile, bot facebook messenger chile, n8n chile',
  authors: [{ name: 'OmniFlow', url: 'https://conectaai.cl' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://conectaai.cl',
    siteName: 'OmniFlow',
    title: 'OmniFlow — CRM Omnicanal con IA para Chile',
    description: 'Automatiza WhatsApp, Instagram, Facebook Messenger, TikTok y Email con IA. Bot que responde solo, CRM integrado y n8n incluido.',
    images: [{ url: 'https://conectaai.cl/og-image.png', width: 1200, height: 630, alt: 'OmniFlow - Automatización Omnicanal Chile' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniFlow — CRM Omnicanal con IA para Chile',
    description: 'Bot que responde solo en WhatsApp, Instagram y Facebook. CRM integrado con n8n. Prueba gratis.',
  },
  alternates: { canonical: 'https://conectaai.cl' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <BrandingProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </BrandingProvider>
        <Script
          src="https://osw.conectaai.cl/widget.js"
          data-tenant="osw"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
