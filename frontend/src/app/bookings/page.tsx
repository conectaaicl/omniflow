'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

function Notif({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,padding:'12px 20px',borderRadius:12,
      background:ok?'#059669':'#dc2626',color:'white',fontWeight:600,fontSize:13,
      boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
      {msg}
    </div>
  )
}

const DAYS = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-100 text-red-700' },
  no_show:   { label: 'No asistio', color: 'bg-gray-100 text-gray-500' },
}

export default function BookingsPage() {
  const [tab, setTab] = useState<'bookings' | 'availability'>('bookings')
  const [bookings, setBookings] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [notif, setNotif] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [actioning, setActioning] = useState<number | null>(null)

  const [bForm, setBForm] = useState({ contact_name:'', contact_phone:'', service:'', scheduled_at:'', duration_minutes:'60', notes:'' })
  const [bErr, setBErr] = useState('')
  const [bSaving, setBSaving] = useState(false)

  const [sForm, setSForm] = useState({ day_of_week:'0', start_time:'09:00', end_time:'10:00', service:'' })
  const [sSaving, setSSaving] = useState(false)

  const notify = (msg: string, ok = true) => {
    setNotif({ msg, ok })
    setTimeout(() => setNotif(null), 3500)
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      const r = await api.get('/bookings', { params })
      setBookings(r.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [statusFilter])

  const loadSlots = useCallback(async () => {
    try {
      const r = await api.get('/bookings/availability')
      setSlots(r.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadBookings() }, [loadBookings])
  useEffect(() => { if (tab === 'availability') loadSlots() }, [tab, loadSlots])

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bForm.service || !bForm.scheduled_at) { setBErr('Servicio y fecha son requeridos'); return }
    setBSaving(true); setBErr('')
    try {
      await api.post('/bookings', { ...bForm, duration_minutes: Number(bForm.duration_minutes), scheduled_at: new Date(bForm.scheduled_at).toISOString() })
      setBForm({ contact_name:'', contact_phone:'', service:'', scheduled_at:'', duration_minutes:'60', notes:'' })
      setShowForm(false)
      notify('Reserva creada')
      loadBookings()
    } catch (ex: any) { setBErr(ex?.response?.data?.detail || 'Error al crear reserva') }
    finally { setBSaving(false) }
  }

  const handleCreateSlot = async () => {
    setSSaving(true)
    try {
      await api.post('/bookings/availability', { ...sForm, day_of_week: Number(sForm.day_of_week) })
      setShowSlotForm(false)
      notify('Horario agregado')
      loadSlots()
    } catch { notify('Error', false) }
    finally { setSSaving(false) }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    setActioning(id)
    try {
      await api.patch(`/bookings/${id}?status=${status}`)
      notify('Actualizado')
      loadBookings()
    } catch { notify('Error', false) }
    finally { setActioning(null) }
  }

  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm('¿Eliminar esta reserva?')) return
    try { await api.delete(`/bookings/${id}`); notify('Eliminada'); loadBookings() }
    catch { notify('Error', false) }
  }

  const handleDeleteSlot = async (id: number) => {
    try { await api.delete(`/bookings/availability/${id}`); notify('Horario eliminado'); loadSlots() }
    catch { notify('Error', false) }
  }

  const todayCount = bookings.filter(b => new Date(b.scheduled_at).toDateString() === new Date().toDateString()).length

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {notif && <Notif msg={notif.msg} ok={notif.ok} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendario & Reservas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestiona citas y disponibilidad para el bot</p>
        </div>
        {tab === 'bookings' && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition">
            + Nueva reserva
          </button>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* New booking form */}
        {showForm && tab === 'bookings' && (
          <form onSubmit={handleCreateBooking} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Nueva reserva</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {bErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{bErr}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([['contact_name','Nombre cliente','Juan Perez'],['contact_phone','Telefono','+56912345678'],['service','Servicio','Consulta, Instalacion']] as const).map(([k, lbl, ph]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{lbl}</label>
                  <input value={(bForm as any)[k]} onChange={e => setBForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Fecha y hora</label>
                <input type="datetime-local" value={bForm.scheduled_at} onChange={e => setBForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Duracion (min)</label>
                <input type="number" min={15} max={480} step={15} value={bForm.duration_minutes}
                  onChange={e => setBForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notas</label>
                <input value={bForm.notes} onChange={e => setBForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Instrucciones..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={bSaving}
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50">
                {bSaving ? 'Guardando...' : 'Crear reserva'}
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit">
          {([['bookings','Reservas'],['availability','Disponibilidad']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${tab === key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* AVAILABILITY TAB */}
        {tab === 'availability' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Horarios disponibles</h3>
              <button onClick={() => setShowSlotForm(!showSlotForm)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-violet-200 text-violet-600 hover:bg-violet-50 transition">
                + Agregar horario
              </button>
            </div>
            {showSlotForm && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Dia</label>
                    <select value={sForm.day_of_week} onChange={e => setSForm(f => ({ ...f, day_of_week: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white">
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Inicio</label>
                    <input type="time" value={sForm.start_time} onChange={e => setSForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Fin</label>
                    <input type="time" value={sForm.end_time} onChange={e => setSForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Servicio</label>
                    <input value={sForm.service} onChange={e => setSForm(f => ({ ...f, service: e.target.value }))}
                      placeholder="Todos" className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                  </div>
                </div>
                <button onClick={handleCreateSlot} disabled={sSaving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50">
                  {sSaving ? 'Guardando...' : 'Guardar horario'}
                </button>
              </div>
            )}
            {slots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin horarios configurados. Agrega los dias y horas en que aceptas reservas.</p>
            ) : (
              <div className="space-y-2">
                {slots.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl text-xs">
                    <span className="font-semibold text-gray-700 w-20">{DAYS[s.day_of_week]}</span>
                    <span className="text-gray-500">{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</span>
                    {s.service ? <span className="text-violet-600">{s.service}</span> : <span className="text-gray-300">Todos</span>}
                    <button onClick={() => handleDeleteSlot(s.id)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS TAB */}
        {tab === 'bookings' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Hoy', value: todayCount, color: 'text-violet-700' },
                { label: 'Total', value: bookings.length, color: 'text-gray-800' },
                { label: 'Confirmadas', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-emerald-600' },
                { label: 'Canceladas', value: bookings.filter(b => b.status === 'cancelled').length, color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['','confirmed','completed','cancelled','no_show'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${statusFilter === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {s === '' ? 'Todas' : STATUS_CFG[s]?.label || s}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-gray-400 text-sm">Cargando...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4 opacity-30">📅</div>
                <p className="font-semibold text-gray-600">Sin reservas</p>
                <p className="text-sm mt-1">Crea una reserva o configura disponibilidad para que el bot agende</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const cfg = STATUS_CFG[b.status] || STATUS_CFG.confirmed
                  const dt = new Date(b.scheduled_at)
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4 items-start">
                          <div className="flex-shrink-0 w-14 text-center bg-violet-50 rounded-xl p-2">
                            <div className="text-lg font-bold text-violet-700">{dt.getDate()}</div>
                            <div className="text-[10px] text-violet-500">{dt.toLocaleDateString('es-CL',{month:'short'})}</div>
                            <div className="text-[10px] text-violet-400">{dt.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-[10px] text-gray-400">{b.duration_minutes} min</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm">{b.service}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {b.display_name}{b.display_phone ? ` · ${b.display_phone}` : ''}
                            </p>
                            {b.notes && <p className="text-xs text-gray-400 mt-1 italic">{b.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          {b.status === 'confirmed' && (
                            <>
                              <button onClick={() => handleUpdateStatus(b.id, 'completed')} disabled={actioning === b.id}
                                className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition disabled:opacity-50">
                                Completar
                              </button>
                              <button onClick={() => handleUpdateStatus(b.id, 'cancelled')} disabled={actioning === b.id}
                                className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50">
                                Cancelar
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDeleteBooking(b.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition text-xs">✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
