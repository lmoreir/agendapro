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
} from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { AgendamentoModal } from '@/components/agendamento-modal'
import { exportAgendamentosToCSV } from '@/lib/export'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado: { label: 'Agendado', bg: 'bg-blue-100', text: 'text-blue-800' },
  confirmado: { label: 'Confirmado', bg: 'bg-green-100', text: 'text-green-800' },
  realizado: { label: 'Realizado', bg: 'bg-gray-100', text: 'text-gray-800' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800' },
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [filterClienteId, setFilterClienteId] = useState('')
  const [filterData, setFilterData] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('')
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

  const agendamentosFiltrados = useMemo(
    () =>
      agendamentos.filter(a => {
        if (filterClienteId && a.cliente_id !== filterClienteId) return false
        if (filterData && a.data !== filterData) return false
        if (filterStatus && a.status !== filterStatus) return false
        return true
      }),
    [agendamentos, filterClienteId, filterData, filterStatus]
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-r from-brand-700 to-brand-900 text-white p-8 shadow-[0_30px_90px_-40px_rgba(17,24,39,0.65)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.36em] text-brand-200/80">Agenda</p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Organize seus agendamentos</h1>
            <p className="mt-4 max-w-2xl text-sm text-brand-100/90 leading-6">
              Filtre por cliente, data e status, acompanhe próximos compromissos e mantenha a agenda alinhada com sua rotina.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Total</p>
              <p className="mt-3 text-3xl font-semibold">{agendamentos.length}</p>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Hoje</p>
              <p className="mt-3 text-3xl font-semibold">{appointmentsTodayCount}</p>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100/80">Próximo</p>
              <p className="mt-3 text-base font-semibold">
                {nextAppointment
                  ? `${formatarData(nextAppointment.data)} • ${formatarHorario(nextAppointment.horario)}`
                  : 'Nenhum agendamento'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-gray-900">Painel de Agendamentos</p>
          <p className="text-sm text-gray-500">Use os filtros para encontrar rapidamente o que precisa.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExportAgendamentos}
            disabled={loading || agendamentosFiltrados.length === 0}
            className="inline-flex items-center gap-2 justify-center bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
          <button
            onClick={handleNovoAgendamento}
            className="inline-flex items-center gap-2 justify-center bg-white text-brand-900 px-4 py-2 rounded-lg hover:bg-brand-50 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                <select
                  value={filterClienteId}
                  onChange={e => setFilterClienteId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={filterData}
                  onChange={e => setFilterData(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Calendário</h2>
                <p className="text-sm text-gray-500">Alterne entre visão semanal e mensal.</p>
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
                  const events = agendamentosFiltrados.filter(agendamento => {
                    const eventDate = new Date(agendamento.data + 'T00:00:00')
                    return isSameDay(eventDate, date)
                  })
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
                                <p className="text-xs text-gray-500">{agendamento.tipo_atendimento}</p>
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
                      const events = agendamentosFiltrados.filter(agendamento => {
                        const eventDate = new Date(agendamento.data + 'T00:00:00')
                        return isSameDay(eventDate, day)
                      })
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

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Visão rápida</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-brand-50 border border-brand-100 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-700">Compromissos filtrados</p>
                <p className="mt-3 text-3xl font-semibold text-gray-900">{agendamentosFiltrados.length}</p>
              </div>
              <div className="rounded-3xl bg-brand-50 border border-brand-100 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-700">Próximo compromisso</p>
                <p className="mt-3 text-base font-semibold text-gray-900">
                  {nextAppointment ? `${formatarData(nextAppointment.data)} • ${formatarHorario(nextAppointment.horario)}` : 'Nenhum agendamento'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tabela de agendamentos</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
              </div>
            ) : agendamentosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-gray-600 mb-6">
                  {filterClienteId || filterData || filterStatus
                    ? 'Tente ajustar os filtros'
                    : 'Comece criando um novo agendamento'}
                </p>
                <button
                  onClick={handleNovoAgendamento}
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Novo Agendamento
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data/Hora</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Paciente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agendamentosFiltrados.map(agendamento => {
                      const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                      return (
                        <tr key={agendamento.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                {formatarData(agendamento.data)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-gray-500" />
                                {formatarHorario(agendamento.horario)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{(agendamento as any).clientes?.nome || 'N/A'}</div>
                            <div className="text-xs text-gray-600">{(agendamento as any).clientes?.sigla}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <User className="w-4 h-4 text-gray-500" />
                                {agendamento.nome_paciente}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Phone className="w-4 h-4 text-gray-500" />
                                {agendamento.whatsapp_paciente}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{agendamento.tipo_atendimento}</div>
                            {agendamento.observacao && (
                              <div className="text-xs text-gray-600 line-clamp-1">{agendamento.observacao}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditAgendamento(agendamento)}
                                className="p-2 text-brand-700 hover:bg-brand-100 rounded transition"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAgendamento(agendamento.id)}
                                disabled={deleting === agendamento.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                title="Deletar"
                              >
                                {deleting === agendamento.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

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
