'use client'

import { useState, useEffect } from 'react'
import { crmAPI } from '@/lib/api'
import { Plus, DollarSign, User, TrendingUp, ChevronRight, ChevronLeft, Target, RefreshCw } from 'lucide-react'

interface Contact { id: number; name: string; lead_score: number }
interface Deal { id: number; title: string; value: number; status: string; contact: Contact }
interface Stage { id: number; name: string; deals: Deal[] }

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-slate-500'
}

const STAGE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706']

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState<number | null>(null)

  const fetchPipeline = () => {
    crmAPI.getPipeline()
      .then((r) => setStages(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPipeline() }, [])

  const moveDeal = async (dealId: number, targetStageId: number) => {
    setMoving(dealId)
    try {
      await crmAPI.moveDeal(dealId, targetStageId)
      fetchPipeline()
    } catch (err) {
      console.error('Move failed', err)
    } finally {
      setMoving(null)
    }
  }

  const totalValue = stages.reduce((sum, s) => sum + s.deals.reduce((a, d) => a + (d.value || 0), 0), 0)
  const totalDeals = stages.reduce((sum, s) => sum + s.deals.length, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline de Ventas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {totalDeals} deals · <span className="text-green-400 font-medium">${totalValue.toLocaleString()}</span> valor total
          </p>
        </div>
        <button
          onClick={fetchPipeline}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white px-3 py-2 rounded-lg transition-all text-sm"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Cargando pipeline...</span>
          </div>
        </div>
      ) : stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Target size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Sin etapas en el pipeline</p>
            <p className="text-xs text-slate-700 mt-1">Configura tu pipeline en el backend</p>
          </div>
        </div>
      ) : (
        /* Kanban board */
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-h-[500px]" style={{ minWidth: `${stages.length * 288 + (stages.length - 1) * 16}px` }}>
            {stages.map((stage, stageIdx) => {
              const color = STAGE_COLORS[stageIdx % STAGE_COLORS.length]
              const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null
              const nextStage = stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null

              return (
                <div key={stage.id} className="w-72 flex-shrink-0 flex flex-col">
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-xs font-semibold text-white uppercase tracking-wide">{stage.name}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${color}20`, color }}
                      >
                        {stage.deals.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">
                      ${stage.deals.reduce((a, d) => a + (d.value || 0), 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Deals */}
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {stage.deals.length === 0 ? (
                      <div
                        className="h-24 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center text-xs text-slate-700"
                      >
                        Sin deals
                      </div>
                    ) : (
                      stage.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="bg-[#0d0d1a] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-medium text-white leading-tight">
                              {deal.title || `Deal #${deal.id}`}
                            </h4>
                            {deal.contact.lead_score >= 70 && (
                              <div className="flex items-center gap-0.5 text-green-400 shrink-0">
                                <TrendingUp size={10} />
                                <span className="text-[9px] font-bold">HOT</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mb-2">
                            <User size={10} className="text-slate-600" />
                            <span className="text-xs text-slate-500 truncate">{deal.contact.name}</span>
                            <span className={`ml-auto text-[10px] font-medium ${scoreColor(deal.contact.lead_score)}`}>
                              {deal.contact.lead_score}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mb-3">
                            <DollarSign size={11} className="text-green-400" />
                            <span className="text-sm font-semibold text-green-400">
                              {(deal.value || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Move buttons (visible on hover) */}
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {prevStage && (
                              <button
                                onClick={() => moveDeal(deal.id, prevStage.id)}
                                disabled={moving === deal.id}
                                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] transition-all disabled:opacity-40"
                              >
                                <ChevronLeft size={10} />
                                {prevStage.name}
                              </button>
                            )}
                            {nextStage && (
                              <button
                                onClick={() => moveDeal(deal.id, nextStage.id)}
                                disabled={moving === deal.id}
                                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] transition-all disabled:opacity-40"
                                style={{ background: `${color}20`, color }}
                              >
                                {nextStage.name}
                                <ChevronRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
