'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Calendar, Clock, User, Phone } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado: { label: 'Agendado', bg: 'bg-blue-100', text: 'text-blue-800' },
  confirmado: { label: 'Confirmado', bg: 'bg-green-100', text: 'text-green-800' },
  realizado: { label: 'Realizado', bg: 'bg-gray-100', text: 'text-gray-800' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800' },
}

export default function ClienteAgendaPage() {
  const { user } = useAuth()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')
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
    if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() - 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() - 1)
    }
    setCurrentDate(nextDate)
  }

  const handleNext = () => {
    const nextDate = new Date(currentDate)
    if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    setCurrentDate(nextDate)
  }

  const handleToday = () => setCurrentDate(new Date())

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.cliente_id) return

        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', user.cliente_id)
          .single()

        if (clienteError) throw clienteError

        setCliente(clienteData)

        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('cliente_id', user.cliente_id)
          .gte('data', new Date().toISOString().split('T')[0])
          .order('data', { ascending: true })
          .order('horario', { ascending: true })

        if (agendamentosError) throw agendamentosError

        setAgendamentos(agendamentosData || [])
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        addToast('Erro ao carregar agendamentos', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, supabase, addToast])

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const formatarHorario = (horario: string) => horario.slice(0, 5)

  const weekDates = buildWeekDates(currentDate)
  const monthDates = buildMonthDates(currentDate)
  const monthRows = Array.from({ length: 6 }).map((_, index) =>
    monthDates.slice(index * 7, index * 7 + 7)
  )

  const eventsForDate = useCallback(
    (date: Date) =>
      agendamentos.filter(agendamento => {
        const eventDate = new Date(agendamento.data + 'T00:00:00')
        return isSameDay(eventDate, date)
      }),
    [agendamentos]
  )

  const upcomingEvents = useMemo(
    () =>
      agendamentos
        .map(ag => ({ ...ag, datetime: new Date(`${ag.data}T${ag.horario}`) }))
        .filter(ag => ag.datetime >= new Date())
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime()),
    [agendamentos]
  )

  const nextEvent = upcomingEvents[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {cliente && (
        <section className="rounded-[2rem] bg-brand-700 text-white p-8 shadow-[0_30px_90px_-40px_rgba(17,24,39,0.65)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.36em] text-brand-200/80">Minha Agenda</p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">{cliente.nome}</h1>
              <p className="mt-3 max-w-2xl text-sm text-brand-100/90 leading-6">
                Acompanhe seus agendamentos futuros, visualize o próximo compromisso e mantenha sua equipe alinhada.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Próximo</p>
                <p className="mt-3 text-2xl font-semibold">
                  {nextEvent
                    ? `${formatarData(nextEvent.data)} • ${formatarHorario(nextEvent.horario)}`
                    : 'Sem agendamentos'}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Total futuro</p>
                <p className="mt-3 text-2xl font-semibold">{agendamentos.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Visão</p>
                <p className="mt-3 text-2xl font-semibold">{calendarView === 'week' ? 'Semanal' : 'Mensal'}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Calendário</h2>
                <p className="text-sm text-gray-500">Veja seus compromissos por semana ou mês.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium transition ${
                    calendarView === 'week'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium transition ${
                    calendarView === 'month'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-2 rounded-2xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Hoje
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">
                {calendarView === 'week'
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

            {calendarView === 'week' ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                {weekDates.map(date => {
                  const events = eventsForDate(date)
                  return (
                    <div key={date.toISOString()} className="rounded-3xl border border-gray-200 p-4 min-h-[170px] bg-gray-50">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                          <p className="text-lg font-semibold text-gray-900">{date.getDate()}</p>
                        </div>
                        <span className="text-[10px] font-semibold uppercase text-gray-500">
                          {date.toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                      </div>
                      {events.length === 0 ? (
                        <p className="text-xs text-gray-500">Sem compromissos</p>
                      ) : (
                        <div className="space-y-2">
                          {events.map(agendamento => {
                            const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                            return (
                              <div key={agendamento.id} className="rounded-2xl border border-gray-200 bg-white p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-gray-900">{formatarHorario(agendamento.horario)}</p>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text}`}>
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate">{agendamento.nome_paciente}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {monthRows.map((week, rowIndex) => (
                  <div key={rowIndex} className="space-y-2">
                    {week.map(day => {
                      const events = eventsForDate(day)
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                      return (
                        <div
                          key={day.toISOString()}
                          className={`rounded-3xl border p-3 h-36 ${
                            isCurrentMonth ? 'border-gray-200 bg-white' : 'border-transparent bg-gray-100 text-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{day.getDate()}</span>
                            {events.length > 0 && (
                              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                                {events.length} ag
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-gray-600 overflow-hidden" style={{ maxHeight: '8rem' }}>
                            {events.slice(0, 2).map(ev => {
                              const config = statusConfig[ev.status as keyof typeof statusConfig]
                              return (
                                <div key={ev.id} className="rounded-2xl bg-gray-50 p-2">
                                  <p className="font-semibold text-gray-900 truncate">{formatarHorario(ev.horario)} - {ev.nome_paciente}</p>
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text}`}>
                                    {config.label}
                                  </span>
                                </div>
                              )
                            })}
                            {events.length > 2 && (
                              <p className="text-[10px] text-gray-500">+{events.length - 2} mais</p>
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

        <aside className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Próximos agendamentos</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum agendamento futuro encontrado.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 4).map(event => {
                  const config = statusConfig[event.status as keyof typeof statusConfig]
                  return (
                    <div key={event.id} className="rounded-3xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900">{event.nome_paciente}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{formatarData(event.data)}</p>
                      <p className="text-sm text-gray-600">{formatarHorario(event.horario)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Detalhes do cliente</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="text-gray-500">Nome</p>
                <p className="font-medium text-gray-900">{cliente?.nome}</p>
              </div>
              <div>
                <p className="text-gray-500">Ramo</p>
                <p className="font-medium text-gray-900">{cliente?.ramo}</p>
              </div>
              <div>
                <p className="text-gray-500">Sigla</p>
                <p className="font-medium text-brand-700">{cliente?.sigla}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {agendamentos.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento futuro</h3>
          <p className="text-gray-600">Você não possui agendamentos futuros no momento.</p>
        </div>
      )}
    </div>
  )
}
