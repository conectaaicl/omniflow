'use client'

import { useState, useEffect } from 'react'
import {
  Zap, ExternalLink, Activity, Phone, Instagram,
  Facebook, Globe, Mail, ArrowRight, CheckCircle2,
  AlertCircle, RefreshCw, Bot
} from 'lucide-react'

const N8N_URL = '/n8n/'

const WORKFLOW_TEMPLATES = [
  {
    id: 1,
    name: 'WhatsApp → IA → CRM',
    desc: 'Recibe mensaje de WhatsApp, analiza intención con IA y crea o actualiza contacto en el CRM.',
    trigger: 'Webhook WhatsApp',
    icon: Phone,
    color: '#25d366',
  },
  {
    id: 2,
    name: 'Facebook Lead → Pipeline',
    desc: 'Captura leads de Facebook Lead Ads y los agrega automáticamente al pipeline de ventas.',
    trigger: 'Facebook Lead Ad',
    icon: Facebook,
    color: '#1877f2',
  },
  {
    id: 3,
    name: 'Instagram DM → Respuesta Auto',
    desc: 'Responde automáticamente mensajes directos de Instagram con mensajes personalizados.',
    trigger: 'Instagram DM',
    icon: Instagram,
    color: '#e1306c',
  },
  {
    id: 4,
    name: 'Lead Score Alto → Notificación',
    desc: 'Cuando un lead supera score 70, notifica al equipo de ventas por email o Slack.',
    trigger: 'Score > 70',
    icon: Bot,
    color: '#7c3aed',
  },
  {
    id: 5,
    name: 'Sin Respuesta → Follow-up',
    desc: 'Si un lead no responde en 24h, envía automáticamente un mensaje de seguimiento.',
    trigger: 'Timer 24h',
    icon: Mail,
    color: '#f59e0b',
  },
  {
    id: 6,
    name: 'Web Form → Bienvenida',
    desc: 'Cuando alguien llena el formulario web, recibe un email y WhatsApp de bienvenida.',
    trigger: 'Webhook Web',
    icon: Globe,
    color: '#06b6d4',
  },
]

export default function AutomationsPage() {
  const [n8nStatus, setN8nStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    fetch('/n8n/', { method: 'HEAD', mode: 'no-cors' })
      .then(() => setN8nStatus('online'))
      .catch(() => setN8nStatus('offline'))
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automatizaciones</h1>
          <p className="text-slate-400 text-sm mt-0.5">Motor de automatización omnicanal con n8n</p>
        </div>
        <a href={N8N_URL} target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium px-4 py-2 rounded-xl transition-all text-sm">
            <Zap size={15} />
            Abrir n8n
            <ExternalLink size={13} />
          </button>
        </a>
      </div>

      {/* n8n status card */}
      <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/10 border border-amber-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Zap size={22} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">n8n Workflow Engine</h3>
                <div className="flex items-center gap-1.5">
                  {n8nStatus === 'checking' && (
                    <><RefreshCw size={12} className="text-slate-500 animate-spin" /><span className="text-xs text-slate-500">Verificando...</span></>
                  )}
                  {n8nStatus === 'online' && (
                    <><CheckCircle2 size={12} className="text-green-400" /><span className="text-xs text-green-400">En línea</span></>
                  )}
                  {n8nStatus === 'offline' && (
                    <><AlertCircle size={12} className="text-amber-400" /><span className="text-xs text-amber-400">Iniciando...</span></>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Editor visual de flujos · Disponible en <code className="text-amber-300 bg-amber-500/10 px-1 rounded text-xs">/n8n/</code>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={N8N_URL} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-all text-sm">
                Abrir editor <ExternalLink size={13} />
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity size={15} className="text-violet-400" />
          Cómo funciona la automatización
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { step: '1', title: 'Mensaje entra', desc: 'WhatsApp, IG, FB, Web', color: '#25d366' },
            { step: '2', title: 'OmniFlow lo recibe', desc: 'Webhook procesa el evento', color: '#7c3aed' },
            { step: '3', title: 'n8n activa el flujo', desc: 'Lógica personalizada', color: '#f59e0b' },
            { step: '4', title: 'Acción ejecutada', desc: 'CRM, email, respuesta', color: '#e1306c' },
          ].map(({ step, title, desc, color }, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${color}20`, color }}>
                  {step}
                </div>
                {i < 3 && <div className="hidden sm:block w-full h-px bg-white/5 mt-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {i < 3 && <ArrowRight size={14} className="text-slate-700 hidden sm:block shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Workflow templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Templates de Workflows</h3>
          <a href={N8N_URL} target="_blank" rel="noopener noreferrer">
            <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
              Crear nuevo en n8n <ArrowRight size={12} />
            </button>
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKFLOW_TEMPLATES.map(({ id, name, desc, trigger, icon: Icon, color }) => (
            <div key={id} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}20` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm">{name}</h4>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-500 mt-1 inline-block">{trigger}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">{desc}</p>
              <a href={N8N_URL} target="_blank" rel="noopener noreferrer">
                <button className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 rounded-lg py-2 transition-all">
                  <Zap size={11} />
                  Implementar en n8n
                </button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
