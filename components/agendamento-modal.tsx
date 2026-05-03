'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, AlertCircle, Clock } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
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
}

function generateTimeSlots(
  horario_inicio: string,
  horario_fim: string,
  duracao: number,
  intervalo: number,
): string[] {
  const [startH, startM] = horario_inicio.split(':').map(Number)
  const [endH, endM] = horario_fim.split(':').map(Number)
  const endMinutes = endH * 60 + endM

  const slots: string[] = []
  let cur = startH * 60 + startM

  while (cur + duracao <= endMinutes) {
    const h = Math.floor(cur / 60).toString().padStart(2, '0')
    const m = (cur % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += duracao + intervalo
  }

  return slots
}

export function AgendamentoModal({
  isOpen,
  onClose,
  onSuccess,
  agendamento,
  clientes,
}: AgendamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [invalidDay, setInvalidDay] = useState(false)

  const [formData, setFormData] = useState({
    cliente_id: '',
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

  useEffect(() => {
    if (agendamento) {
      setFormData({
        cliente_id: agendamento.cliente_id,
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
      setFormData({
        cliente_id: clientes.length === 1 ? clientes[0].id : '',
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
    setAvailableSlots([])
    setInvalidDay(false)
  }, [agendamento, isOpen])

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id)
  const isClienteSaude = clienteSelecionado
    ? RAMOS_SAUDE.includes(clienteSelecionado.ramo)
    : false

  // Recalcula slots disponíveis quando cliente ou data mudam
  const recomputeSlots = useCallback(async () => {
    if (!clienteSelecionado || !formData.data) {
      setAvailableSlots([])
      setInvalidDay(false)
      return
    }

    // Valida dia da semana
    const date = new Date(formData.data + 'T00:00:00')
    const dayOfWeek = date.getDay()
    const isValid = clienteSelecionado.dias_atendimento.includes(dayOfWeek)
    setInvalidDay(!isValid)

    if (!isValid) {
      setAvailableSlots([])
      return
    }

    const allSlots = generateTimeSlots(
      clienteSelecionado.horario_inicio,
      clienteSelecionado.horario_fim,
      clienteSelecionado.duracao_atendimento,
      clienteSelecionado.intervalo_entre,
    )

    setLoadingSlots(true)
    try {
      let query = supabase
        .from('agendamentos')
        .select('horario')
        .eq('cliente_id', clienteSelecionado.id)
        .eq('data', formData.data)
        .neq('status', 'cancelado')

      // Ao editar, exclui o próprio agendamento para liberar o slot atual
      if (agendamento?.id) {
        query = query.neq('id', agendamento.id)
      }

      const { data: occupied } = await query
      const occupiedTimes = (occupied || []).map((a: { horario: string }) =>
        a.horario.slice(0, 5),
      )

      setAvailableSlots(allSlots.filter(slot => !occupiedTimes.includes(slot)))
    } catch {
      setAvailableSlots(allSlots)
    } finally {
      setLoadingSlots(false)
    }
  }, [clienteSelecionado, formData.data, agendamento?.id])

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
      tipo_pagamento: '',
      convenio_nome: '',
      horario: '',
    }))
  }

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, data: e.target.value, horario: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = validateFormularioAgendamento(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      addToast(Object.values(validation.errors)[0], 'error')
      return
    }

    if (invalidDay) {
      addToast('Este dia não está disponível para o cliente selecionado', 'error')
      return
    }

    if (isClienteSaude && !formData.tipo_pagamento) {
      addToast('Informe se o atendimento é Convênio ou Particular', 'error')
      return
    }
    if (
      isClienteSaude &&
      formData.tipo_pagamento === 'convenio' &&
      !formData.convenio_nome.trim()
    ) {
      addToast('Informe o nome do convênio', 'error')
      return
    }

    setLoading(true)

    const dataToSave = {
      cliente_id: formData.cliente_id,
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
            convenio_nome:
              formData.tipo_pagamento === 'convenio'
                ? formData.convenio_nome
                : null,
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
        const { error } = await supabase
          .from('agendamentos')
          .insert([dataToSave])
        if (error) throw error
      }

      onSuccess()
      onClose()
      addToast(
        agendamento
          ? 'Agendamento atualizado com sucesso!'
          : 'Agendamento criado com sucesso!',
        'success',
      )
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      addToast('Erro ao salvar agendamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const diasDisponiveis = clienteSelecionado?.dias_atendimento
    .slice()
    .sort((a, b) => a - b)
    .map(d => DIAS_SEMANA_LABEL[d])
    .join(', ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-6 border-b bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
          {/* Cliente e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={e => handleClienteChange(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cliente_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} ({cliente.sigla})
                  </option>
                ))}
              </select>
              {errors.cliente_id && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.cliente_id}
                </p>
              )}
              {/* Exibe dias disponíveis do cliente */}
              {clienteSelecionado && diasDisponiveis && (
                <p className="text-xs text-gray-500 mt-1">
                  Atende: <span className="font-medium">{diasDisponiveis}</span>
                  {' · '}
                  {clienteSelecionado.horario_inicio.slice(0, 5)}–{clienteSelecionado.horario_fim.slice(0, 5)}
                  {' · '}
                  {clienteSelecionado.duracao_atendimento}min
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atendimento *
              </label>
              <input
                type="text"
                name="tipo_atendimento"
                value={formData.tipo_atendimento}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.tipo_atendimento ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ex: Consulta, Procedimento"
              />
              {errors.tipo_atendimento && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.tipo_atendimento}
                </p>
              )}
            </div>
          </div>

          {/* Nome do Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Paciente *
            </label>
            <input
              type="text"
              name="nome_paciente"
              value={formData.nome_paciente}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.nome_paciente ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Nome completo"
            />
            {errors.nome_paciente && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.nome_paciente}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp do Paciente *
            </label>
            <input
              type="tel"
              name="whatsapp_paciente"
              value={formData.whatsapp_paciente}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.whatsapp_paciente ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="11 99999-9999"
            />
            {errors.whatsapp_paciente && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.whatsapp_paciente}
              </p>
            )}
          </div>

          {/* Convênio / Particular */}
          {isClienteSaude && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Informações de Pagamento
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pagamento *
                  </label>
                  <select
                    name="tipo_pagamento"
                    value={formData.tipo_pagamento}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                  </select>
                </div>
                {formData.tipo_pagamento === 'convenio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Convênio *
                    </label>
                    <input
                      type="text"
                      name="convenio_nome"
                      value={formData.convenio_nome}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Unimed, Bradesco Saúde"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data e Horário */}
          <div className="grid grid-cols-3 gap-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleDataChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.data || invalidDay ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.data && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.data}
                </p>
              )}
              {invalidDay && !errors.data && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Dia sem atendimento. Dias válidos: {diasDisponiveis}
                </p>
              )}
            </div>

            {/* Horário — select com slots calculados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário *
              </label>
              {loadingSlots ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <select
                  name="horario"
                  value={formData.horario}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.cliente_id || !formData.data || invalidDay}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 ${
                    errors.horario ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {!formData.cliente_id
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
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              )}
              {errors.horario && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.horario}
                </p>
              )}
              {!loadingSlots && formData.cliente_id && formData.data && !invalidDay && availableSlots.length === 0 && (
                <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Todos os horários estão ocupados neste dia.
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Anotações adicionais..."
            />
          </div>

          {/* Actions */}
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
              {loading
                ? 'Salvando...'
                : agendamento
                  ? 'Atualizar'
                  : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
