'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Check,
  Calendar, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Cliente, Especialista } from '@/types'

const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

type ScheduleSource = {
  dias_atendimento: number[]
  horario_inicio: string
  horario_fim: string
  duracao_atendimento: number
  intervalo_entre: number
}

function generateTimeSlots(src: ScheduleSource): string[] {
  const [startH, startM] = src.horario_inicio.split(':').map(Number)
  const [endH, endM] = src.horario_fim.split(':').map(Number)
  const endMinutes = endH * 60 + endM
  const slots: string[] = []
  let cur = startH * 60 + startM
  while (cur + src.duracao_atendimento <= endMinutes) {
    slots.push(
      `${Math.floor(cur / 60).toString().padStart(2, '0')}:${(cur % 60).toString().padStart(2, '0')}`,
    )
    cur += src.duracao_atendimento + src.intervalo_entre
  }
  return slots
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

type Step = 'especialista' | 'data' | 'horario' | 'info' | 'sucesso'

export default function AutoAgendamentoPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.clienteId as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [especialistas, setEspecialistas] = useState<Especialista[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('especialista')
  const [especialistaSelecionado, setEspecialistaSelecionado] = useState<Especialista | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: c, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clienteId)
          .single()

        if (error || !c || !c.pode_agendar) { setNotFound(true); return }
        setCliente(c)

        const { data: esps } = await supabase
          .from('especialistas')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('status', 'ativo')
          .order('nome')
        setEspecialistas(esps || [])

        if (!esps || esps.length === 0) setStep('data')
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clienteId])

  const scheduleSource: ScheduleSource | null = especialistaSelecionado ?? cliente ?? null

  const availableDates = (() => {
    if (!scheduleSource) return []
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 60; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      if (scheduleSource.dias_atendimento.includes(d.getDay())) dates.push(d)
    }
    return dates
  })()

  useEffect(() => {
    if (!dataSelecionada || !scheduleSource) return
    const load = async () => {
      setLoadingSlots(true)
      const allSlots = generateTimeSlots(scheduleSource)
      try {
        let query = supabase
          .from('agendamentos')
          .select('horario')
          .eq('data', dataSelecionada)
          .neq('status', 'cancelado')

        if (especialistaSelecionado) {
          query = query.eq('especialista_id', especialistaSelecionado.id)
        } else {
          query = query.eq('cliente_id', clienteId).is('especialista_id', null)
        }

        const { data: occupied } = await query
        const occupiedTimes = (occupied || []).map((a: { horario: string }) => a.horario.slice(0, 5))
        setAvailableSlots(allSlots.filter(s => !occupiedTimes.includes(s)))
      } catch {
        setAvailableSlots(allSlots)
      } finally {
        setLoadingSlots(false)
      }
    }
    load()
  }, [dataSelecionada, especialistaSelecionado, clienteId])

  const handleSubmit = async () => {
    setFormError('')
    if (!nome.trim()) { setFormError('Informe seu nome'); return }
    if (!whatsapp.trim()) { setFormError('Informe seu WhatsApp'); return }
    if (!tipoAtendimento.trim()) { setFormError('Informe o tipo de atendimento'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('agendamentos').insert([{
        cliente_id: clienteId,
        especialista_id: especialistaSelecionado?.id || null,
        nome_paciente: nome.trim(),
        whatsapp_paciente: whatsapp.trim(),
        data: dataSelecionada,
        horario: horarioSelecionado,
        tipo_atendimento: tipoAtendimento.trim(),
        observacao: observacao.trim() || null,
        status: 'agendado',
      }])
      if (error) throw error
      setStep('sucesso')
    } catch {
      setFormError('Erro ao criar agendamento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    if (step === 'especialista') router.push(`/p/${clienteId}`)
    else if (step === 'data') especialistas.length > 0 ? setStep('especialista') : router.push(`/p/${clienteId}`)
    else if (step === 'horario') setStep('data')
    else if (step === 'info') setStep('horario')
  }

  const stepNumber = step === 'especialista' ? 1
    : step === 'data' ? (especialistas.length > 0 ? 2 : 1)
    : step === 'horario' ? (especialistas.length > 0 ? 3 : 2)
    : step === 'info' ? (especialistas.length > 0 ? 4 : 3)
    : 0
  const totalSteps = especialistas.length > 0 ? 4 : 3

  const selectedDate = dataSelecionada ? new Date(dataSelecionada + 'T00:00:00') : null

  const stepTitle: Record<Step, string> = {
    especialista: 'Escolha o profissional',
    data: 'Escolha a data',
    horario: 'Escolha o horário',
    info: 'Seus dados',
    sucesso: 'Agendado!',
  }

  if (loading) return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="text-lg font-semibold text-gray-700">Agendamento indisponível</p>
      <p className="text-sm text-gray-400">Este link não permite agendamentos no momento.</p>
      <button
        onClick={() => router.push(`/p/${clienteId}`)}
        className="mt-2 text-brand-600 text-sm font-medium underline"
      >
        Ver agenda
      </button>
    </div>
  )

  if (step === 'sucesso') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Agendado com sucesso!</h1>
      <p className="text-gray-500 mb-1">
        {nome}, seu horário está confirmado.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full max-w-sm text-left space-y-3 my-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Estabelecimento</p>
          <p className="text-sm font-semibold text-gray-900">{cliente?.nome}</p>
        </div>
        {especialistaSelecionado && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Profissional</p>
            <p className="text-sm font-semibold text-gray-900">{especialistaSelecionado.nome}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Data e horário</p>
          <p className="text-sm font-semibold text-gray-900">
            {selectedDate
              ? `${DIAS_LABEL[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${MESES_LABEL[selectedDate.getMonth()]} às ${horarioSelecionado}`
              : horarioSelecionado}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo de atendimento</p>
          <p className="text-sm font-semibold text-gray-900">{tipoAtendimento}</p>
        </div>
      </div>

      <button
        onClick={() => router.push(`/p/${clienteId}`)}
        className="text-brand-600 text-sm font-medium underline"
      >
        Ver agenda da semana
      </button>
      <p className="text-xs text-gray-400 mt-8">
        Gerado pelo <span className="font-semibold text-brand-600">AgendaPro</span>
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{cliente?.nome}</p>
            <p className="text-sm font-semibold text-gray-900">{stepTitle[step]}</p>
          </div>
          <span className="text-xs text-gray-400 font-medium flex-shrink-0">
            {stepNumber}/{totalSteps}
          </span>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-brand-600 transition-all duration-300"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* ── Step: Especialista ── */}
        {step === 'especialista' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-4">Selecione o profissional para o seu atendimento</p>
            {especialistas.map(esp => (
              <button
                key={esp.id}
                onClick={() => {
                  setEspecialistaSelecionado(esp)
                  setDataSelecionada('')
                  setHorarioSelecionado('')
                  setStep('data')
                }}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 hover:border-brand-300 hover:bg-brand-50 transition text-left"
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-700 font-bold text-lg">{esp.nome[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{esp.nome}</p>
                  {esp.especialidade && (
                    <p className="text-sm text-gray-500">{esp.especialidade}</p>
                  )}
                  <p className="text-xs text-brand-600 mt-0.5">
                    {esp.horario_inicio.slice(0, 5)}–{esp.horario_fim.slice(0, 5)} · {esp.duracao_atendimento}min
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── Step: Data ── */}
        {step === 'data' && (
          <div>
            {especialistaSelecionado && (
              <div className="bg-brand-50 rounded-2xl border border-brand-100 p-3 flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-800 font-bold text-sm">{especialistaSelecionado.nome[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-900">{especialistaSelecionado.nome}</p>
                  {especialistaSelecionado.especialidade && (
                    <p className="text-xs text-brand-700">{especialistaSelecionado.especialidade}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">Selecione uma data disponível (próximos 60 dias)</p>
            {availableDates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">Nenhuma data disponível.</p>
              </div>
            ) : (
              (() => {
                const groups: { month: string; dates: Date[] }[] = []
                availableDates.forEach(d => {
                  const m = `${MESES_LABEL[d.getMonth()]} ${d.getFullYear()}`
                  const last = groups[groups.length - 1]
                  if (!last || last.month !== m) groups.push({ month: m, dates: [d] })
                  else last.dates.push(d)
                })
                return (
                  <div className="space-y-4">
                    {groups.map(g => (
                      <div key={g.month}>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{g.month}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {g.dates.map(d => {
                            const ds = toDateStr(d)
                            const isToday = ds === toDateStr(new Date())
                            return (
                              <button
                                key={ds}
                                onClick={() => {
                                  setDataSelecionada(ds)
                                  setHorarioSelecionado('')
                                  setStep('horario')
                                }}
                                className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col items-center hover:border-brand-400 hover:bg-brand-50 transition"
                              >
                                <span className="text-[10px] font-medium uppercase text-gray-400">{DIAS_LABEL[d.getDay()]}</span>
                                <span className="text-lg font-bold text-gray-900 leading-tight">{d.getDate()}</span>
                                <span className="text-[10px] text-gray-400">{MESES_SHORT[d.getMonth()]}</span>
                                {isToday && (
                                  <span className="text-[9px] font-bold text-brand-600 mt-0.5">hoje</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>
        )}

        {/* ── Step: Horario ── */}
        {step === 'horario' && (
          <div>
            {selectedDate && (
              <div className="bg-brand-50 rounded-2xl border border-brand-100 p-3 flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-brand-800" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-900">
                    {DIAS_LABEL[selectedDate.getDay()]}, {selectedDate.getDate()} de {MESES_LABEL[selectedDate.getMonth()]}
                  </p>
                  {especialistaSelecionado && (
                    <p className="text-xs text-brand-700">{especialistaSelecionado.nome}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">Selecione um horário disponível</p>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Verificando horários...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">Nenhum horário disponível neste dia.</p>
                <button
                  onClick={() => setStep('data')}
                  className="mt-4 text-brand-600 text-sm font-medium underline"
                >
                  Escolher outra data
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => { setHorarioSelecionado(slot); setStep('info') }}
                    className="bg-white rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-900 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Info pessoal ── */}
        {step === 'info' && (
          <div>
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-4 mb-6 space-y-1.5">
              <p className="text-xs text-brand-700 font-semibold uppercase tracking-wide mb-2">Resumo</p>
              {especialistaSelecionado && (
                <p className="text-sm text-brand-900">
                  <span className="text-brand-600">Profissional:</span> {especialistaSelecionado.nome}
                </p>
              )}
              {selectedDate && (
                <p className="text-sm text-brand-900">
                  <span className="text-brand-600">Data:</span>{' '}
                  {DIAS_LABEL[selectedDate.getDay()]}, {selectedDate.getDate()} de {MESES_LABEL[selectedDate.getMonth()]}
                </p>
              )}
              <p className="text-sm text-brand-900">
                <span className="text-brand-600">Horário:</span> {horarioSelecionado}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu nome *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp *</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de atendimento *</label>
                <input
                  type="text"
                  value={tipoAtendimento}
                  onChange={e => setTipoAtendimento(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  placeholder="Ex: Consulta, Corte, Limpeza..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observações <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm resize-none"
                  placeholder="Alguma informação adicional..."
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center pb-6">
        <p className="text-xs text-gray-400">
          Gerado pelo <span className="font-semibold text-brand-600">AgendaPro</span>
        </p>
      </div>
    </div>
  )
}
