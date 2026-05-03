'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { validateFormularioAgendamento } from '@/lib/validations'

const RAMOS_SAUDE = ['Médicos e Clínicas', 'Dentistas', 'Psicólogos']

interface AgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  agendamento?: Agendamento | null
  clientes: Cliente[]
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

  // Preencher form se for edição
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
        cliente_id: '',
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
  }, [agendamento, isOpen])

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id)
  const isClienteSaude = clienteSelecionado ? RAMOS_SAUDE.includes(clienteSelecionado.ramo) : false

  const handleClienteChange = (clienteId: string) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      tipo_pagamento: '',
      convenio_nome: '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = validateFormularioAgendamento(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      const firstError = Object.values(validation.errors)[0]
      addToast(firstError, 'error')
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
        const { error } = await supabase
          .from('agendamentos')
          .insert([dataToSave])

        if (error) throw error
      }

      onSuccess()
      onClose()
      addToast(agendamento ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      addToast('Erro ao salvar agendamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-6 border-b bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
          {/* Row 1: Cliente e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => handleClienteChange(e.target.value)}
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

          {/* Row 2: Paciente */}
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

          {/* Row 3: WhatsApp Paciente */}
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

          {/* Convênio / Particular — apenas para Médicos, Dentistas e Psicólogos */}
          {isClienteSaude && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Informações de Pagamento
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Atendimento *
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

          {/* Row 4: Data e Horário */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.data ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.data && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.data}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário *
              </label>
              <input
                type="time"
                name="horario"
                value={formData.horario}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.horario ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.horario && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.horario}
                </p>
              )}
            </div>
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

          {/* Row 5: Observação */}
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
