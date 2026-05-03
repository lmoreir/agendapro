'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { validateFormularioCliente } from '@/lib/validations'

const RAMOS_FIXOS = [
  'Médicos e Clínicas',
  'Dentistas',
  'Psicólogos',
  'Esteticistas e Salões',
  'Fotógrafos',
]
const RAMOS_OPTIONS = [...RAMOS_FIXOS, 'Outros prestadores de serviços']

const DIAS_SEMANA = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sab', value: 6 },
  { label: 'Dom', value: 0 },
]

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  cliente?: Cliente | null
}

export function ClientModal({ isOpen, onClose, onSuccess, cliente }: ClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ramoCategoria, setRamoCategoria] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    ramo: '',
    whatsapp: '',
    email: '',
    dias_atendimento: [] as number[],
    horario_inicio: '',
    horario_fim: '',
    duracao_atendimento: 30,
    intervalo_entre: 0,
    observacoes: '',
    sigla: '',
    status: 'ativo' as const,
  })

  const supabase = createClient()
  const { addToast } = useToast()

  const handleRamoCategoriaChange = (value: string) => {
    setRamoCategoria(value)
    if (value !== 'Outros prestadores de serviços') {
      setFormData(prev => ({ ...prev, ramo: value }))
    } else {
      setFormData(prev => ({ ...prev, ramo: '' }))
    }
  }

  // Preencher form se for edição
  useEffect(() => {
    if (cliente && isOpen) {
      const categoria = RAMOS_FIXOS.includes(cliente.ramo)
        ? cliente.ramo
        : 'Outros prestadores de serviços'
      setRamoCategoria(categoria)
      setFormData({
        nome: cliente.nome,
        ramo: cliente.ramo,
        whatsapp: cliente.whatsapp,
        email: cliente.email || '',
        dias_atendimento: cliente.dias_atendimento || [],
        horario_inicio: cliente.horario_inicio,
        horario_fim: cliente.horario_fim,
        duracao_atendimento: cliente.duracao_atendimento,
        intervalo_entre: cliente.intervalo_entre,
        observacoes: cliente.observacoes || '',
        sigla: cliente.sigla,
        status: cliente.status,
      })
    } else if (isOpen && !cliente) {
      setRamoCategoria('')
      setFormData({
        nome: '',
        ramo: '',
        whatsapp: '',
        email: '',
        dias_atendimento: [],
        horario_inicio: '',
        horario_fim: '',
        duracao_atendimento: 30,
        intervalo_entre: 0,
        observacoes: '',
        sigla: '',
        status: 'ativo',
      })
    }
  }, [cliente, isOpen])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('duracao') || name.includes('intervalo') ? parseInt(value) : value,
    }))
  }

  const handleDiaChange = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias_atendimento: prev.dias_atendimento.includes(dia)
        ? prev.dias_atendimento.filter(d => d !== dia)
        : [...prev.dias_atendimento, dia],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validar formulário
    const validation = validateFormularioCliente(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      const firstError = Object.values(validation.errors)[0]
      addToast(firstError, 'error')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        dias_atendimento: formData.dias_atendimento.sort((a, b) => a - b),
      }

      if (cliente) {
        // Atualizar
        const { error } = await supabase
          .from('clientes')
          .update(dataToSave)
          .eq('id', cliente.id)

        if (error) throw error
      } else {
        // Inserir
        const { error } = await supabase
          .from('clientes')
          .insert([dataToSave])

        if (error) throw error
      }

      // Reset form
      setFormData({
        nome: '',
        ramo: '',
        whatsapp: '',
        email: '',
        dias_atendimento: [],
        horario_inicio: '',
        horario_fim: '',
        duracao_atendimento: 30,
        intervalo_entre: 0,
        observacoes: '',
        sigla: '',
        status: 'ativo',
      })

      onSuccess()
      onClose()
      addToast(cliente ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      addToast('Erro ao salvar cliente', 'error')
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
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
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
          {/* Row 1: Nome e Sigla */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Nome do cliente"
              />
              {errors.nome && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.nome}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sigla *
              </label>
              <input
                type="text"
                name="sigla"
                value={formData.sigla}
                onChange={handleInputChange}
                required
                maxLength={10}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.sigla ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ex: ABC"
              />
              {errors.sigla && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.sigla}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Ramo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ramo de Atividade *
            </label>
            <select
              value={ramoCategoria}
              onChange={e => handleRamoCategoriaChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.ramo ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione o ramo de atividade</option>
              {RAMOS_OPTIONS.map(ramo => (
                <option key={ramo} value={ramo}>{ramo}</option>
              ))}
            </select>
            {ramoCategoria === 'Outros prestadores de serviços' && (
              <div className="mt-3">
                <input
                  type="text"
                  name="ramo"
                  value={formData.ramo}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ramo ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Descreva o ramo de atividade"
                />
              </div>
            )}
            {errors.ramo && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.ramo}
              </p>
            )}
          </div>

          {/* Row 3: WhatsApp e Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp *
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.whatsapp ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="11 99999-9999"
              />
              {errors.whatsapp && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.whatsapp}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="cliente@email.com"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Dias de Atendimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dias de Atendimento *
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DIAS_SEMANA.map(dia => (
                <label
                  key={dia.value}
                  className="flex items-center justify-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.dias_atendimento.includes(dia.value)}
                    onChange={() => handleDiaChange(dia.value)}
                    className="hidden"
                  />
                  <span
                    className={`text-sm font-medium transition ${
                      formData.dias_atendimento.includes(dia.value)
                        ? 'bg-blue-500 text-white px-3 py-1 rounded'
                        : 'text-gray-700'
                    }`}
                  >
                    {dia.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.dias_atendimento && (
              <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.dias_atendimento}
              </p>
            )}
          </div>

          {/* Row 5: Horários */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário Início *
              </label>
              <input
                type="time"
                name="horario_inicio"
                value={formData.horario_inicio}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.horarios ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário Fim *
              </label>
              <input
                type="time"
                name="horario_fim"
                value={formData.horario_fim}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.horarios ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
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
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            {errors.horarios && (
              <div className="col-span-3">
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.horarios}
                </p>
              </div>
            )}
          </div>

          {/* Row 6: Duração e Intervalo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração do Atendimento (minutos) *
              </label>
              <input
                type="number"
                name="duracao_atendimento"
                value={formData.duracao_atendimento}
                onChange={handleInputChange}
                required
                min="15"
                step="15"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.duracao ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.duracao && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.duracao}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo entre Atendimentos (minutos)
              </label>
              <input
                type="number"
                name="intervalo_entre"
                value={formData.intervalo_entre}
                onChange={handleInputChange}
                min="0"
                step="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 7: Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Observações adicionais..."
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
                : cliente
                  ? 'Atualizar Cliente'
                  : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
