'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Phone,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { AgendamentoModal } from '@/components/agendamento-modal'
import { exportAgendamentosToCSV } from '@/lib/export'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado:   { label: 'Agendado',   bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  confirmado: { label: 'Confirmado', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-500'  },
  realizado:  { label: 'Realizado',  bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-400'   },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400'    },
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [popover, setPopover] = useState<{ agendamento: Agendamento; x: number; y: number } | null>(null)
  const [notifOpen, setNotifOpen] = useState(true)

  const [filterClienteId, setFilterClienteId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [calendarView, setCalendarView] = useState<'week' | 'month' | 'day'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const supabase = createClient()
  const { addToast } = useToast()

  const getWeekStart = (date: Date) => {
    const current = new Date(date)
    const day = current.getDay()
    const diff = current.getDate() - ((day + 6) % 7)
    current.setHours(0, 0, 0, 0)
    current.setDate(diff)
    return current
  }

  const buildWeekDates = (date: Date) => {
    const start = getWeekStart(date)
    return Array.from({ length: 7 }).map((_, index) => {
      const nextDay = new Date(start)
      nextDay.setDate(start.getDate() + index)
      return nextDay
    })
  }

  const buildMonthDates = (date: Date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const start = getWeekStart(monthStart)
    return Array.from({ length: 42 }).map((_, index) => {
      const nextDay = new Date(start)
      nextDay.setDate(start.getDate() + index)
      return nextDay
    })
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const formatMonthLabel = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })

  const handlePrev = () => {
    const nextDate = new Date(currentDate)
    if (calendarView === 'day') {
      nextDate.setDate(nextDate.getDate() - 1)
    } else if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() - 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() - 1)
    }
    setCurrentDate(nextDate)
  }

  const handleNext = () => {
    const nextDate = new Date(currentDate)
    if (calendarView === 'day') {
      nextDate.setDate(nextDate.getDate() + 1)
    } else if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    setCurrentDate(nextDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setCalendarView('day')
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [clientesRes, agendamentosRes] = await Promise.all([
        supabase.from('clientes').select('*').order('nome'),
        supabase
          .from('agendamentos')
          .select('*, clientes(id, nome, sigla, ramo)')
          .order('data', { ascending: true })
          .order('horario', { ascending: true }),
      ])

      if (clientesRes.error) throw clientesRes.error
      if (agendamentosRes.error) throw agendamentosRes.error

      setClientes(clientesRes.data || [])
      setAgendamentos(agendamentosRes.data as Agendamento[] || [])
      console.log('Clientes carregados:', clientesRes.data)
      console.log('Agendamentos carregados:', agendamentosRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      addToast('Erro ao carregar agendamentos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgendamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este agendamento?')) return

    setDeleting(id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAgendamentos(prev => prev.filter(a => a.id !== id))
      addToast('Agendamento deletado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao deletar:', error)
      addToast('Erro ao deletar agendamento', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleEditAgendamento = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento)
    setIsModalOpen(true)
  }

  const handleNovoAgendamento = () => {
    setSelectedAgendamento(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAgendamento(null)
  }

  const handleCardClick = (agendamento: Agendamento, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.min(rect.left, window.innerWidth - 260)
    const y = rect.bottom + 6 > window.innerHeight - 200 ? rect.top - 180 : rect.bottom + 6
    setPopover({ agendamento, x, y })
  }

  const handleQuickStatus = async (id: string, status: Agendamento['status']) => {
    try {
      const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
      if (error) throw error
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      addToast(`Status: ${statusConfig[status].label}`, 'success')
      setPopover(null)
    } catch {
      addToast('Erro ao atualizar status', 'error')
    }
  }

  const agendamentosFiltrados = useMemo(
    () =>
      agendamentos.filter(a => {
        if (filterClienteId && a.cliente_id !== filterClienteId) return false
        if (filterStatus && a.status !== filterStatus) return false
        return true
      }),
    [agendamentos, filterClienteId, filterStatus]
  )

  const appointmentsTodayCount = useMemo(
    () => agendamentos.filter(a => a.data === new Date().toISOString().split('T')[0]).length,
    [agendamentos]
  )

  const nextAppointment = useMemo(() => {
    const now = new Date()
    return agendamentos
      .map(a => ({
        ...a,
        datetime: new Date(`${a.data}T${a.horario}`),
      }))
      .filter(a => a.datetime >= now)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())[0]
  }, [agendamentos])

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const formatarDataCurta = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })

  const formatarHorario = (horario: string) => horario.slice(0, 5)

  const weekDates = buildWeekDates(currentDate)
  const monthDates = buildMonthDates(currentDate)
  const monthRows = Array.from({ length: 6 }).map((_, index) =>
    monthDates.slice(index * 7, index * 7 + 7)
  )

  const handleExportAgendamentos = () => {
    try {
      const filename = `agendamentos-${new Date().toISOString().split('T')[0]}`
      exportAgendamentosToCSV(agendamentosFiltrados, filename)
      addToast('Agendamentos exportados com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      addToast('Erro ao exportar agendamentos', 'error')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const handler = () => {
      setSelectedAgendamento(null)
      setIsModalOpen(true)
    }
    window.addEventListener('topbar:novoAgendamento', handler)
    return () => window.removeEventListener('topbar:novoAgendamento', handler)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-r from-brand-700 to-brand-900 text-white p-8 shadow-[0_30px_90px_-40px_rgba(17,24,39,0.65)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.36em] text-brand-200/80">Agenda</p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Organize seus agendamentos</h1>
            <p className="mt-4 max-w-2xl text-sm text-brand-100/90 leading-6">
              Visualize e gerencie todos os seus compromissos em um único lugar.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-200" />
                  <span className="text-sm font-medium text-brand-200">Filtros:</span>
                </div>
                <select
                  value={filterClienteId}
                  onChange={e => setFilterClienteId(e.target.value)}
                  className="px-3 py-2 border border-brand-300/30 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-brand-300/30 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="">Todos os status</option>
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2">
                  <p className="text-xs text-brand-200/80">Total</p>
                  <p className="text-lg font-semibold">{agendamentos.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2">
                  <p className="text-xs text-brand-200/80">Hoje</p>
                  <p className="text-lg font-semibold">{appointmentsTodayCount}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2">
                  <p className="text-xs text-brand-200/80">Próximo</p>
                  <p className="text-sm font-semibold">
                    {nextAppointment
                      ? `${formatarDataCurta(nextAppointment.data)} ${formatarHorario(nextAppointment.horario)}`
                      : 'Nenhum'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExportAgendamentos}
              disabled={loading || agendamentosFiltrados.length === 0}
              className="inline-flex items-center gap-2 justify-center bg-white text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </button>
            <button
              onClick={handleNovoAgendamento}
              className="inline-flex items-center gap-2 justify-center bg-white text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Novo
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agenda - {formatMonthLabel(currentDate).toUpperCase()}</h2>
                <p className="text-sm text-gray-500 mt-1">Visualize todos os agendamentos do período.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['day', 'week', 'month'] as const).map(view => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => view === 'day' ? handleToday() : setCalendarView(view)}
                    className={`px-3 py-2 rounded-2xl text-sm font-medium transition ${
                      calendarView === view
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {view === 'day' ? 'Hoje' : view === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {calendarView === 'day'
                  ? currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : calendarView === 'week'
                  ? `Semana de ${formatarData(weekDates[0].toISOString().split('T')[0])} a ${formatarData(weekDates[6].toISOString().split('T')[0])}`
                  : formatMonthLabel(currentDate)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {calendarView === 'day' ? (() => {
              const HOUR_START = 7
              const HOUR_END = 21
              const HOUR_HEIGHT = 64
              const TIME_SLOTS = HOUR_END - HOUR_START
              const todayEvents = agendamentosFiltrados.filter(a => {
                const eventDate = new Date(a.data + 'T00:00:00')
                return isSameDay(eventDate, currentDate)
              })
              return (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Cabeçalho do dia */}
                  <div className={`flex items-center gap-3 px-4 py-3 border-b-2 border-gray-200 ${isSameDay(currentDate, new Date()) ? 'bg-brand-50' : 'bg-gray-50'}`}>
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xl font-bold flex-shrink-0 ${
                      isSameDay(currentDate, new Date()) ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      {currentDate.getDate()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {todayEvents.length === 0 ? 'Sem agendamentos' : `${todayEvents.length} agendamento${todayEvents.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>

                  {/* Grade temporal do dia */}
                  <div className="overflow-y-auto max-h-[520px]">
                    <div className="flex" style={{ height: `${TIME_SLOTS * HOUR_HEIGHT}px` }}>
                      {/* Horas */}
                      <div className="w-14 flex-shrink-0 relative border-r border-gray-200 bg-gray-50">
                        {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-full flex items-start justify-end pr-2 pt-0.5"
                            style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                          >
                            <span className="text-[10px] text-gray-400 font-medium">
                              {String(HOUR_START + i).padStart(2, '0')}:00
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Coluna do dia */}
                      <div className="flex-1 relative">
                        {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                          <div key={i} className="absolute inset-x-0 border-t border-gray-100" style={{ top: `${i * HOUR_HEIGHT}px` }} />
                        ))}
                        {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                          <div key={`h${i}`} className="absolute inset-x-0 border-t border-gray-50" style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
                        ))}
                        {todayEvents.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-gray-400">Sem agendamentos para este dia</p>
                          </div>
                        )}
                        {todayEvents.map(agendamento => {
                          const [h, m] = agendamento.horario.split(':').map(Number)
                          const topPx = (h - HOUR_START + m / 60) * HOUR_HEIGHT
                          const duration = (agendamento as any).clientes?.duracao_atendimento || 30
                          const heightPx = Math.max(42, (duration / 60) * HOUR_HEIGHT)
                          const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                          const clienteName = (agendamento as any).clientes?.nome || ''
                          return (
                            <div
                              key={agendamento.id}
                              className={`absolute left-2 right-2 rounded-xl border-l-[4px] px-3 py-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${config.bg} ${config.border}`}
                              style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 10 }}
                              onClick={e => handleCardClick(agendamento, e)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold leading-tight ${config.text}`}>
                                    {formatarHorario(agendamento.horario)}
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight mt-0.5">
                                    {agendamento.nome_paciente}
                                  </p>
                                  {clienteName && heightPx >= 56 && (
                                    <p className="text-xs text-gray-600 truncate">{clienteName}</p>
                                  )}
                                </div>
                                <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })() : calendarView === 'week' ? (() => {
              const HOUR_START = 7
              const HOUR_END = 21
              const HOUR_HEIGHT = 64
              const TIME_SLOTS = HOUR_END - HOUR_START
              return (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <div className="min-w-[640px]">
                    {/* Day headers */}
                    <div className="flex border-b-2 border-gray-200 bg-gray-50">
                      <div className="w-14 flex-shrink-0 border-r border-gray-200" />
                      {weekDates.map(date => {
                        const isToday = isSameDay(date, new Date())
                        return (
                          <div key={date.toISOString()} className="flex-1 text-center py-2 px-1 border-l border-gray-200">
                            <p className="text-[10px] uppercase tracking-wide font-bold text-brand-700">
                              {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </p>
                            <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full mt-1 text-sm font-bold ${
                              isToday ? 'bg-brand-600 text-white' : 'text-gray-900'
                            }`}>
                              {date.getDate()}
                            </div>
                            <p className="text-[9px] text-gray-400 mt-0.5 uppercase">
                              {date.toLocaleDateString('pt-BR', { month: 'short' })}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Scrollable time grid */}
                    <div className="overflow-y-auto max-h-[520px]">
                      <div className="flex" style={{ height: `${TIME_SLOTS * HOUR_HEIGHT}px` }}>
                        {/* Time labels */}
                        <div className="w-14 flex-shrink-0 relative border-r border-gray-200 bg-gray-50">
                          {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-full flex items-start justify-end pr-2 pt-0.5"
                              style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                            >
                              <span className="text-[10px] text-gray-400 font-medium">
                                {String(HOUR_START + i).padStart(2, '0')}:00
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Day columns */}
                        {weekDates.map(date => {
                          const dayEvents = agendamentosFiltrados.filter(a => {
                            const eventDate = new Date(a.data + 'T00:00:00')
                            return isSameDay(eventDate, date)
                          })
                          const isToday = isSameDay(date, new Date())
                          return (
                            <div
                              key={date.toISOString()}
                              className={`flex-1 relative border-l border-gray-200 ${isToday ? 'bg-brand-50/30' : ''}`}
                            >
                              {/* Hour dividers */}
                              {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute inset-x-0 border-t border-gray-100"
                                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                                />
                              ))}
                              {/* Half-hour dividers */}
                              {Array.from({ length: TIME_SLOTS }).map((_, i) => (
                                <div
                                  key={`h${i}`}
                                  className="absolute inset-x-0 border-t border-gray-50"
                                  style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                                />
                              ))}

                              {/* Events */}
                              {dayEvents.map(agendamento => {
                                const [h, m] = agendamento.horario.split(':').map(Number)
                                const topPx = (h - HOUR_START + m / 60) * HOUR_HEIGHT
                                const duration = (agendamento as any).clientes?.duracao_atendimento || 30
                                const heightPx = Math.max(34, (duration / 60) * HOUR_HEIGHT)
                                const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                                const clienteName = (agendamento as any).clientes?.nome || ''
                                return (
                                  <div
                                    key={agendamento.id}
                                    className={`absolute left-1 right-1 rounded-lg border-l-[3px] px-1.5 py-1 cursor-pointer hover:shadow-md hover:brightness-95 transition-all overflow-hidden ${config.bg} ${config.border}`}
                                    style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 10 }}
                                    onClick={e => handleCardClick(agendamento, e)}
                                  >
                                    <p className="text-[10px] font-bold text-brand-800 leading-tight">
                                      {formatarHorario(agendamento.horario)}
                                    </p>
                                    <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">
                                      {agendamento.nome_paciente}
                                    </p>
                                    {clienteName && heightPx >= 52 && (
                                      <p className="text-[9px] text-gray-600 truncate">{clienteName}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <div className="grid grid-cols-7 gap-2">
                {monthRows.map((week, rowIndex) => (
                  <div key={rowIndex} className="space-y-2">
                    {week.map(day => {
                      const events = agendamentosFiltrados.filter(agendamento => {
                        const eventDate = new Date(agendamento.data + 'T00:00:00')
                        return isSameDay(eventDate, day)
                      })
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                      return (
                        <div
                          key={day.toISOString()}
                          className={`rounded-2xl border p-2 min-h-[140px] flex flex-col ${
                            isCurrentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 text-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-bold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                              {day.getDate()}
                            </span>
                            {events.length > 0 && (
                              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                                {events.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-[11px] flex-1 overflow-hidden">
                            {events.slice(0, 3).map(ev => {
                              const config = statusConfig[ev.status as keyof typeof statusConfig]
                              const clienteName = (ev as any).clientes?.nome || ''
                              return (
                                <div
                                  key={ev.id}
                                  className={`rounded p-1.5 border-l-2 cursor-pointer hover:brightness-95 transition-all ${
                                    isCurrentMonth
                                      ? `${config.bg} ${config.border}`
                                      : 'bg-gray-100 border-gray-300 text-gray-500'
                                  }`}
                                  onClick={e => handleCardClick(ev, e)}
                                >
                                  <p className={`font-bold truncate ${isCurrentMonth ? config.text : ''}`}>{formatarHorario(ev.horario)}</p>
                                  <p className="truncate text-gray-800">{ev.nome_paciente}</p>
                                  {clienteName && <p className="text-[9px] truncate text-gray-600">{clienteName}</p>}
                                </div>
                              )
                            })}
                            {events.length > 3 && (
                              <p className="text-[10px] text-gray-500 font-medium px-1.5">
                                +{events.length - 3} mais
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer select-none border-b border-gray-100"
              onClick={() => setNotifOpen(v => !v)}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-700">Avisos</span>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                  {agendamentosFiltrados.length}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${notifOpen ? 'rotate-180' : ''}`} />
            </div>

            {notifOpen && (
              <div className="p-1.5 space-y-0.5 max-h-[480px] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-700" />
                  </div>
                ) : agendamentosFiltrados.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-4">Sem agendamentos</p>
                ) : (
                  agendamentosFiltrados.slice(0, 40).map(agendamento => {
                    const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                    return (
                      <div
                        key={agendamento.id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-l-2 ${config.bg} ${config.border} hover:brightness-95 transition cursor-pointer`}
                        onClick={e => handleCardClick(agendamento, e)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold truncate leading-tight ${config.text}`}>
                            {agendamento.nome_paciente}
                          </p>
                          <p className="text-[9px] text-gray-400 leading-tight">
                            {formatarDataCurta(agendamento.data)} · {formatarHorario(agendamento.horario)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Popover de status rápido */}
      {popover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-200 w-56 p-3"
            style={{ top: popover.y, left: popover.x }}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 truncate px-1">
              {popover.agendamento.nome_paciente}
            </p>
            <div className="space-y-1 mb-3">
              {(Object.entries(statusConfig) as [Agendamento['status'], typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleQuickStatus(popover.agendamento.id, key)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80 ${cfg.bg} ${cfg.text} ${
                    popover.agendamento.status === key ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full border ${cfg.border} bg-current flex-shrink-0`} />
                  {cfg.label}
                  {popover.agendamento.status === key && (
                    <span className="ml-auto text-[10px] font-bold opacity-60">atual</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                handleEditAgendamento(popover.agendamento)
                setPopover(null)
              }}
              className="w-full px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition"
            >
              Editar agendamento
            </button>
          </div>
        </>
      )}

      <AgendamentoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadData}
        agendamento={selectedAgendamento}
        clientes={clientes}
      />
    </div>
  )
}
