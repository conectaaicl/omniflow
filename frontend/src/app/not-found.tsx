'use client'

import Link from 'next/link'
import { ArrowLeft, Wifi } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080812] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 mb-6 shadow-2xl shadow-violet-500/30">
          <Wifi size={28} className="text-white" />
        </div>
        <div className="text-8xl font-bold text-white/5 mb-2 leading-none select-none">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
          La página que buscas no existe o fue movida.
        </p>
        <Link href="/dashboard">
          <button className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm">
            <ArrowLeft size={14} />
            Ir al dashboard
          </button>
        </Link>
      </div>
    </div>
  )
}
