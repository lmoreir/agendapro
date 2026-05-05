'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, Loader2, AlertCircle, X, Phone, Calendar, Stethoscope, CreditCard, FileText, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Cliente, Agendamento, Especialista } from '@/types'

const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const statusConfig = {
  agendado:   { label: 'Agendado',   bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  confirmado: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  realizado:  { label: 'Realizado',  bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400'    },
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function AgendaPublicaPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const clienteId = params.clienteId as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [especialistas, setEspecialistas] = useState<Especialista[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedAg, setSelectedAg] = useState<Agendamento | null>(null)

  const supabase = createClient()

  // Semana atual: derivada do query param ?w=YYYY-MM-DD ou hoje
  const getWeekStart = useCallback(() => {
    const w = searchParams.get('w')
    if (w) return getMonday(new Date(w + 'T00:00:00'))
    return getMonday(new Date())
  }, [searchParams])

  const weekStart = getWeekStart()
  const weekEnd = addDays(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const navWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7)
    router.push(`/p/${clienteId}?w=${toDateStr(next)}`)
  }

  const isCurrentWeek = toDateStr(getMonday(new Date())) === toDateStr(weekStart)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: clienteData, error: clienteErr } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clienteId)
          .single()

        if (clienteErr || !clienteData) { setNotFound(true); return }
        setCliente(clienteData)

        const [agRes, espRes] = await Promise.all([
          supabase
            .from('agendamentos')
            .select('*')
            .eq('cliente_id', clienteId)
            .gte('data', toDateStr(weekStart))
            .lte('data', toDateStr(weekEnd))
            .neq('status', 'cancelado')
            .order('data')
            .order('horario'),
          supabase
            .from('especialistas')
            .select('*')
            .eq('cliente_id', clienteId)
            .eq('status', 'ativo'),
        ])

        setAgendamentos(agRes.data || [])
        setEspecialistas(espRes.data || [])
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clienteId, searchParams])

  const agsPorDia = (date: Date) =>
    agendamentos.filter(a => a.data === toDateStr(date))

  const totalSemana = agendamentos.length
  const confirmados = agendamentos.filter(a => a.status === 'confirmado').length

  const weekLabel = `${weekStart.getDate()} ${MESES_LABEL[weekStart.getMonth()]} — ${weekEnd.getDate()} ${MESES_LABEL[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`

  if (loading) return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="text-lg font-semibold text-gray-700">Agenda não encontrada</p>
      <p className="text-sm text-gray-400">O link pode ter expirado ou a clínica não existe.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-200/70 mb-1">AgendaPro</p>
          <h1 className="text-2xl font-semibold">{cliente?.nome}</h1>
          <p className="text-sm text-brand-100/70 mt-0.5">{cliente?.ramo}</p>

          {/* Mini stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-xs text-brand-200/80 uppercase tracking-wide">Esta semana</p>
              <p className="text-2xl font-bold mt-1">{totalSemana}</p>
              <p className="text-xs text-brand-100/60">agendamentos</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-xs text-brand-200/80 uppercase tracking-wide">Confirmados</p>
              <p className="text-2xl font-bold mt-1">{confirmados}</p>
              <p className="text-xs text-brand-100/60">de {totalSemana}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => navWeek(-1)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-gray-900">{weekLabel}</p>
            {isCurrentWeek && (
              <span className="text-xs text-brand-600 font-medium">Semana atual</span>
            )}
          </div>

          <button
            onClick={() => navWeek(1)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Mini day pills — quick scroll nav on mobile */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {weekDays.map(day => {
            const count = agsPorDia(day).length
            const isToday = toDateStr(day) === toDateStr(new Date())
            return (
              <a
                key={toDateStr(day)}
                href={`#dia-${toDateStr(day)}`}
                className={`flex flex-col items-center min-w-[2.5rem] px-1 py-1.5 rounded-xl text-center transition ${
                  isToday ? 'bg-brand-600 text-white' : count > 0 ? 'bg-brand-50 text-brand-700' : 'text-gray-400'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">{DIAS_LABEL[day.getDay()]}</span>
                <span className="text-sm font-bold">{day.getDate()}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-semibold mt-0.5 ${isToday ? 'text-white/80' : 'text-brand-600'}`}>
                    {count}
                  </span>
                )}
              </a>
            )
          })}
        </div>
      </div>

      {/* Days list */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">
        {weekDays.map(day => {
          const ags = agsPorDia(day)
          const isToday = toDateStr(day) === toDateStr(new Date())
          const isPast = day < new Date() && !isToday

          return (
            <div key={toDateStr(day)} id={`dia-${toDateStr(day)}`}>
              {/* Day header */}
              <div className={`flex items-center gap-2 mb-2 ${isPast ? 'opacity-50' : ''}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isToday
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {day.getDate()}
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    {DIAS_LABEL[day.getDay()]}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    {MESES_LABEL[day.getMonth()]}
                  </span>
                  {isToday && (
                    <span className="ml-2 text-[10px] font-bold text-brand-600 uppercase tracking-wide">
                      Hoje
                    </span>
                  )}
                </div>
                {ags.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">
                    {ags.length} {ags.length === 1 ? 'agendamento' : 'agendamentos'}
                  </span>
                )}
              </div>

              {/* Appointments */}
              {ags.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-sm text-gray-400">
                  Sem agendamentos
                </div>
              ) : (
                <div className="space-y-2">
                  {ags.map(ag => {
                    const cfg = statusConfig[ag.status as keyof typeof statusConfig] ?? statusConfig.agendado
                    const esp = especialistas.find(e => e.id === ag.especialista_id)
                    return (
                      <div
                        key={ag.id}
                        onClick={() => setSelectedAg(ag)}
                        className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform ${isPast ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{ag.nome_paciente}</p>
                              {ag.tipo_atendimento && (
                                <p className="text-xs text-gray-500 mt-0.5">{ag.tipo_atendimento}</p>
                              )}
                              {esp && (
                                <p className="text-xs text-brand-600 mt-0.5 font-medium">{esp.nome}{esp.especialidade ? ` · ${esp.especialidade}` : ''}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="flex items-center gap-1 text-gray-700">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-sm font-mono font-semibold">{ag.horario.slice(0, 5)}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                        {ag.convenio_nome && (
                          <p className="text-xs text-blue-600 mt-2 ml-5">Convênio: {ag.convenio_nome}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center pb-8 pt-2">
        <p className="text-xs text-gray-400">Gerado pelo <span className="font-semibold text-brand-600">AgendaPro</span></p>
      </div>

      {/* FAB — agendar */}
      {cliente?.pode_agendar && !selectedAg && (
        <div className="fixed bottom-6 right-4 z-30">
          <button
            onClick={() => router.push(`/p/${clienteId}/agendar`)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3.5 rounded-full shadow-lg shadow-brand-900/30 transition active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Agendar
          </button>
        </div>
      )}

      {/* Detail bottom sheet */}
      {selectedAg && (() => {
        const ag = selectedAg
        const cfg = statusConfig[ag.status as keyof typeof statusConfig] ?? statusConfig.agendado
        const esp = especialistas.find(e => e.id === ag.especialista_id)
        const dayDate = new Date(ag.data + 'T00:00:00')
        const dateLabel = `${DIAS_LABEL[dayDate.getDay()]}, ${dayDate.getDate()} de ${MESES_LABEL[dayDate.getMonth()]} ${dayDate.getFullYear()}`
        const whatsFormatted = ag.whatsapp_paciente
          ? ag.whatsapp_paciente.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '+$1 ($2) $3-$4')
          : null
        const waLink = ag.whatsapp_paciente
          ? `https://wa.me/55${ag.whatsapp_paciente.replace(/\D/g, '')}`
          : null

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelectedAg(null)}
            />

            {/* Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
              {/* Handle + close */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                <div />
                <button
                  onClick={() => setSelectedAg(null)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition ml-auto"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="px-5 pb-8 space-y-4">
                {/* Patient name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{ag.nome_paciente}</p>
                    {ag.tipo_atendimento && (
                      <p className="text-sm text-gray-500 mt-0.5">{ag.tipo_atendimento}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 mt-1 ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Data</p>
                      <p className="text-sm font-medium text-gray-900">{dateLabel}</p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Horário</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{ag.horario.slice(0, 5)}</p>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  {whatsFormatted && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">WhatsApp</p>
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-emerald-600 underline"
                          >
                            {whatsFormatted}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{whatsFormatted}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Specialist */}
                  {esp && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Especialista</p>
                        <p className="text-sm font-medium text-gray-900">{esp.nome}{esp.especialidade ? ` · ${esp.especialidade}` : ''}</p>
                      </div>
                    </div>
                  )}

                  {/* Convenio */}
                  {ag.convenio_nome && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Convênio</p>
                        <p className="text-sm font-medium text-gray-900">{ag.convenio_nome}</p>
                      </div>
                    </div>
                  )}

                  {/* Observacao */}
                  {ag.observacao && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Observação</p>
                        <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{ag.observacao}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
