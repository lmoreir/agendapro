'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, AlertCircle, Clock } from 'lucide-react'
import { Agendamento, Cliente, Especialista } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { validateFormularioAgendamento } from '@/lib/validations'

const RAMOS_SAUDE = ['Médicos e Clínicas', 'Dentistas', 'Psicólogos']

const DIAS_SEMANA_LABEL: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

interface AgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  agendamento?: Agendamento | null
  clientes: Cliente[]
  defaultClienteId?: string
}

// Tipo union com a config de horários (cliente ou especialista)
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

export function AgendamentoModal({
  isOpen,
  onClose,
  onSuccess,
  agendamento,
  clientes,
  defaultClienteId,
}: AgendamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Especialistas do cliente selecionado
  const [especialistas, setEspecialistas] = useState<Especialista[]>([])
  const [loadingEsp, setLoadingEsp] = useState(false)

  // Slots de horário
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [invalidDay, setInvalidDay] = useState(false)

  const [formData, setFormData] = useState({
    cliente_id: '',
    especialista_id: '',
    nome_paciente: '',
    whatsapp_paciente: '',
    data: '',
    horario: '',
    tipo_atendimento: '',
    tipo_pagamento: '' as '' | 'convenio' | 'particular',
    convenio_nome: '',
    observacao: '',
    status: 'agendado' as const,
  })

  const supabase = createClient()
  const { addToast } = useToast()

  // Preenche form na abertura
  useEffect(() => {
    if (agendamento) {
      setFormData({
        cliente_id: agendamento.cliente_id,
        especialista_id: agendamento.especialista_id || '',
        nome_paciente: agendamento.nome_paciente,
        whatsapp_paciente: agendamento.whatsapp_paciente,
        data: agendamento.data,
        horario: agendamento.horario,
        tipo_atendimento: agendamento.tipo_atendimento,
        tipo_pagamento: agendamento.tipo_pagamento || '',
        convenio_nome: agendamento.convenio_nome || '',
        observacao: agendamento.observacao || '',
        status: agendamento.status,
      })
    } else {
      const preCliente = defaultClienteId || (clientes.length === 1 ? clientes[0].id : '')
      setFormData({
        cliente_id: preCliente,
        especialista_id: '',
        nome_paciente: '',
        whatsapp_paciente: '',
        data: new Date().toISOString().split('T')[0],
        horario: '',
        tipo_atendimento: '',
        tipo_pagamento: '',
        convenio_nome: '',
        observacao: '',
        status: 'agendado',
      })
    }
    setEspecialistas([])
    setAvailableSlots([])
    setInvalidDay(false)
  }, [agendamento, isOpen])

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id)
  const especialistaSelecionado = especialistas.find(e => e.id === formData.especialista_id)
  const isClienteSaude = clienteSelecionado ? RAMOS_SAUDE.includes(clienteSelecionado.ramo) : false

  // Busca especialistas ao trocar cliente
  useEffect(() => {
    if (!formData.cliente_id) {
      setEspecialistas([])
      return
    }
    const fetch = async () => {
      setLoadingEsp(true)
      const { data } = await supabase
        .from('especialistas')
        .select('*')
        .eq('cliente_id', formData.cliente_id)
        .eq('status', 'ativo')
        .order('nome')
      setEspecialistas(data || [])
      setLoadingEsp(false)
    }
    fetch()
  }, [formData.cliente_id])

  // Fonte de schedule: especialista (se selecionado) ou cliente (fallback)
  const scheduleSource: ScheduleSource | null =
    especialistaSelecionado ?? clienteSelecionado ?? null

  // Recalcula slots ao trocar especialista, data ou cliente
  const recomputeSlots = useCallback(async () => {
    if (!scheduleSource || !formData.data) {
      setAvailableSlots([])
      setInvalidDay(false)
      return
    }

    // Valida dia da semana
    const dayOfWeek = new Date(formData.data + 'T00:00:00').getDay()
    const isValid = scheduleSource.dias_atendimento.includes(dayOfWeek)
    setInvalidDay(!isValid)

    if (!isValid) {
      setAvailableSlots([])
      return
    }

    const allSlots = generateTimeSlots(scheduleSource)
    setLoadingSlots(true)
    try {
      // Filtra slots ocupados — por especialista (se houver) ou por cliente sem especialista
      let query = supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', formData.data)
        .neq('status', 'cancelado')

      if (especialistaSelecionado) {
        query = query.eq('especialista_id', especialistaSelecionado.id)
      } else {
        query = query.eq('cliente_id', formData.cliente_id).is('especialista_id', null)
      }

      if (agendamento?.id) {
        query = query.neq('id', agendamento.id)
      }

      const { data: occupied } = await query
      const occupiedTimes = (occupied || []).map((a: { horario: string }) => a.horario.slice(0, 5))
      setAvailableSlots(allSlots.filter(s => !occupiedTimes.includes(s)))
    } catch {
      setAvailableSlots(allSlots)
    } finally {
      setLoadingSlots(false)
    }
  }, [scheduleSource, formData.data, formData.cliente_id, especialistaSelecionado, agendamento?.id])

  useEffect(() => {
    recomputeSlots()
  }, [recomputeSlots])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleClienteChange = (clienteId: string) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      especialista_id: '',
      tipo_pagamento: '',
      convenio_nome: '',
      horario: '',
    }))
  }

  const handleEspecialistaChange = (id: string) => {
    setFormData(prev => ({ ...prev, especialista_id: id, horario: '' }))
  }

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, data: e.target.value, horario: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Requer especialista quando o cliente tem especialistas cadastrados
    if (especialistas.length > 0 && !formData.especialista_id) {
      addToast('Selecione o especialista / profissional', 'error')
      return
    }

    const validation = validateFormularioAgendamento(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      addToast(Object.values(validation.errors)[0], 'error')
      return
    }

    if (invalidDay) {
      addToast('Este dia não está disponível para o profissional selecionado', 'error')
      return
    }

    if (isClienteSaude && !formData.tipo_pagamento) {
      addToast('Informe se o atendimento é Convênio ou Particular', 'error')
      return
    }
    if (isClienteSaude && formData.tipo_pagamento === 'convenio' && !formData.convenio_nome.trim()) {
      addToast('Informe o nome do convênio', 'error')
      return
    }

    setLoading(true)

    const dataToSave = {
      cliente_id: formData.cliente_id,
      especialista_id: formData.especialista_id || null,
      nome_paciente: formData.nome_paciente,
      whatsapp_paciente: formData.whatsapp_paciente,
      data: formData.data,
      horario: formData.horario,
      tipo_atendimento: formData.tipo_atendimento,
      observacao: formData.observacao,
      status: formData.status,
      ...(isClienteSaude && formData.tipo_pagamento
        ? {
            tipo_pagamento: formData.tipo_pagamento,
            convenio_nome: formData.tipo_pagamento === 'convenio' ? formData.convenio_nome : null,
          }
        : { tipo_pagamento: null, convenio_nome: null }),
    }

    try {
      if (agendamento) {
        const { error } = await supabase
          .from('agendamentos')
          .update(dataToSave)
          .eq('id', agendamento.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('agendamentos').insert([dataToSave])
        if (error) throw error
      }
      onSuccess()
      onClose()
      addToast(agendamento ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success')
    } catch (error) {
      console.error(error)
      addToast('Erro ao salvar agendamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const diasDisponiveis = scheduleSource?.dias_atendimento
    .slice()
    .sort((a, b) => a - b)
    .map(d => DIAS_SEMANA_LABEL[d])
    .join(', ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex justify-between items-center p-6 border-b bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
              <select
                value={formData.cliente_id}
                onChange={e => handleClienteChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cliente_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.sigla})</option>
                ))}
              </select>
              {errors.cliente_id && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.cliente_id}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Atendimento *</label>
              <input
                type="text"
                name="tipo_atendimento"
                value={formData.tipo_atendimento}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.tipo_atendimento ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ex: Consulta, Corte, Procedimento"
              />
              {errors.tipo_atendimento && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.tipo_atendimento}
                </p>
              )}
            </div>
          </div>

          {/* Especialista — exibido quando o cliente tem especialistas */}
          {formData.cliente_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialista / Profissional {especialistas.length > 0 ? '*' : ''}
              </label>
              {loadingEsp ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando profissionais...
                </div>
              ) : especialistas.length === 0 ? (
                <div className="text-xs text-gray-400 py-1">
                  Nenhum especialista cadastrado — usando agenda geral do cliente.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {especialistas.map(esp => (
                    <button
                      key={esp.id}
                      type="button"
                      onClick={() => handleEspecialistaChange(esp.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                        formData.especialista_id === esp.id
                          ? 'border-brand-600 bg-brand-50 text-brand-900'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <p className="font-semibold truncate">{esp.nome}</p>
                      {esp.especialidade && (
                        <p className="text-xs text-gray-400 truncate">{esp.especialidade}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info de agenda do profissional selecionado */}
          {scheduleSource && diasDisponiveis && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-gray-500">
              Atende: <span className="font-medium text-gray-700">{diasDisponiveis}</span>
              {' · '}
              {scheduleSource.horario_inicio.slice(0, 5)}–{scheduleSource.horario_fim.slice(0, 5)}
              {' · '}
              {scheduleSource.duracao_atendimento}min por atendimento
            </div>
          )}

          {/* Nome e WhatsApp do paciente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Paciente *</label>
              <input
                type="text"
                name="nome_paciente"
                value={formData.nome_paciente}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome_paciente ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Nome completo"
              />
              {errors.nome_paciente && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.nome_paciente}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp *</label>
              <input
                type="tel"
                name="whatsapp_paciente"
                value={formData.whatsapp_paciente}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.whatsapp_paciente ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="11 99999-9999"
              />
              {errors.whatsapp_paciente && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.whatsapp_paciente}
                </p>
              )}
            </div>
          </div>

          {/* Convênio / Particular */}
          {isClienteSaude && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Informações de Pagamento</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pagamento *</label>
                  <select
                    name="tipo_pagamento"
                    value={formData.tipo_pagamento}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                  </select>
                </div>
                {formData.tipo_pagamento === 'convenio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Convênio *</label>
                    <input
                      type="text"
                      name="convenio_nome"
                      value={formData.convenio_nome}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ex: Unimed, Bradesco"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data, Horário e Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleDataChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.data || invalidDay ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.data && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.data}
                </p>
              )}
              {invalidDay && !errors.data && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />Dia sem atendimento ({diasDisponiveis})
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário *</label>
              {loadingSlots ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <select
                  name="horario"
                  value={formData.horario}
                  onChange={handleInputChange}
                  disabled={!scheduleSource || !formData.data || invalidDay}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 ${
                    errors.horario ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {!scheduleSource
                      ? 'Selecione o cliente'
                      : !formData.data
                        ? 'Selecione a data'
                        : invalidDay
                          ? 'Dia indisponível'
                          : availableSlots.length === 0
                            ? 'Sem horários livres'
                            : 'Selecione o horário'}
                  </option>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              )}
              {errors.horario && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.horario}
                </p>
              )}
              {!loadingSlots && scheduleSource && formData.data && !invalidDay && availableSlots.length === 0 && (
                <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />Todos os horários ocupados neste dia.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
              placeholder="Anotações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Salvando...' : agendamento ? 'Atualizar' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
