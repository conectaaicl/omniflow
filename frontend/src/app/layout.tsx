import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ConditionalLayout from '@/components/ConditionalLayout'
import { BrandingProvider } from '@/components/providers/BrandingProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OmniFlow — Automatización Omnicanal',
  description: 'Conecta WhatsApp, Instagram, Facebook, TikTok, Shopify y Email en un solo lugar. Automatización inteligente con n8n e IA.',
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
