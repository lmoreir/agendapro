'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'

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
  const [formData, setFormData] = useState({
    cliente_id: '',
    nome_paciente: '',
    whatsapp_paciente: '',
    data: '',
    horario: '',
    tipo_atendimento: '',
    observacao: '',
    status: 'agendado' as const,
  })

  const supabase = createClient()

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
        observacao: agendamento.observacao || '',
        status: agendamento.status,
      })
    } else {
      // Limpar form para novo
      setFormData({
        cliente_id: '',
        nome_paciente: '',
        whatsapp_paciente: '',
        data: new Date().toISOString().split('T')[0],
        horario: '',
        tipo_atendimento: '',
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

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      // Não preenchemos automaticamente, mas poderia
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (agendamento) {
        // Atualizar
        const { error } = await supabase
          .from('agendamentos')
          .update(formData)
          .eq('id', agendamento.id)

        if (error) throw error
      } else {
        // Inserir
        const { error } = await supabase
          .from('agendamentos')
          .insert([formData])

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      alert('Erro ao salvar agendamento')
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} ({cliente.sigla})
                  </option>
                ))}
              </select>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Consulta, Procedimento"
              />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome completo"
            />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="11 99999-9999"
            />
          </div>

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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
