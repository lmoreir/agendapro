'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'
import { Cliente, Especialista } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'

const DIAS_SEMANA = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
]

const DIAS_LABEL: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

const emptyForm = {
  nome: '',
  especialidade: '',
  dias_atendimento: [] as number[],
  horario_inicio: '',
  horario_fim: '',
  duracao_atendimento: 30,
  intervalo_entre: 0,
  status: 'ativo' as 'ativo' | 'inativo',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  cliente: Cliente
}

export function EspecialistasModal({ isOpen, onClose, cliente }: Props) {
  const [especialistas, setEspecialistas] = useState<Especialista[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Especialista | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('especialistas')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('nome')
      if (error) throw error
      setEspecialistas(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addToast(`Erro ao carregar especialistas: ${msg}`, 'error')
      console.error('Especialistas load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      load()
      setMode('list')
    }
  }, [isOpen])

  const openAdd = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      dias_atendimento: [...cliente.dias_atendimento],
      horario_inicio: cliente.horario_inicio,
      horario_fim: cliente.horario_fim,
      duracao_atendimento: cliente.duracao_atendimento,
      intervalo_entre: cliente.intervalo_entre,
    })
    setErrors({})
    setMode('form')
  }

  const openEdit = (esp: Especialista) => {
    setEditing(esp)
    setForm({
      nome: esp.nome,
      especialidade: esp.especialidade || '',
      dias_atendimento: esp.dias_atendimento,
      horario_inicio: esp.horario_inicio,
      horario_fim: esp.horario_fim,
      duracao_atendimento: esp.duracao_atendimento,
      intervalo_entre: esp.intervalo_entre,
      status: esp.status,
    })
    setErrors({})
    setMode('form')
  }

  const handleDia = (dia: number) => {
    setForm(prev => ({
      ...prev,
      dias_atendimento: prev.dias_atendimento.includes(dia)
        ? prev.dias_atendimento.filter(d => d !== dia)
        : [...prev.dias_atendimento, dia],
    }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.dias_atendimento.length === 0) e.dias = 'Selecione ao menos um dia'
    if (!form.horario_inicio) e.horario_inicio = 'Obrigatório'
    if (!form.horario_fim) e.horario_fim = 'Obrigatório'
    if (form.horario_inicio >= form.horario_fim) e.horario_fim = 'Fim deve ser após o início'
    if (form.duracao_atendimento < 15) e.duracao = 'Mínimo 15 minutos'
    if (form.duracao_atendimento % 15 !== 0) e.duracao = 'Deve ser múltiplo de 15'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      addToast(Object.values(e)[0], 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        cliente_id: cliente.id,
        nome: form.nome.trim(),
        especialidade: form.especialidade.trim() || null,
        dias_atendimento: form.dias_atendimento.slice().sort((a, b) => a - b),
        horario_inicio: form.horario_inicio,
        horario_fim: form.horario_fim,
        duracao_atendimento: form.duracao_atendimento,
        intervalo_entre: form.intervalo_entre,
        status: form.status,
      }

      if (editing) {
        const { error } = await supabase
          .from('especialistas')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        addToast('Especialista atualizado!', 'success')
      } else {
        const { error } = await supabase.from('especialistas').insert([payload])
        if (error) throw error
        addToast('Especialista adicionado!', 'success')
      }

      await load()
      setMode('list')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addToast(`Erro ao salvar: ${msg}`, 'error')
      console.error('Especialistas save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este especialista? Os agendamentos vinculados perderão a referência.')) return
    setDeleting(id)
    try {
      const { error } = await supabase.from('especialistas').delete().eq('id', id)
      if (error) throw error
      setEspecialistas(prev => prev.filter(e => e.id !== id))
      addToast('Especialista removido!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addToast(`Erro ao deletar: ${msg}`, 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode === 'form' && (
              <button
                onClick={() => setMode('list')}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <p className="text-xs text-brand-600 font-medium uppercase tracking-wide">
                {cliente.nome}
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'list'
                  ? 'Especialistas / Profissionais'
                  : editing
                    ? 'Editar Especialista'
                    : 'Novo Especialista'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIST MODE */}
        {mode === 'list' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Adicionar Especialista
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
              </div>
            ) : especialistas.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum especialista cadastrado</p>
                <p className="text-sm text-gray-400 mt-1">
                  Adicione os profissionais que atendem neste estabelecimento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {especialistas.map(esp => (
                  <div
                    key={esp.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{esp.nome}</p>
                        {esp.especialidade && (
                          <span className="text-xs text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full shrink-0">
                            {esp.especialidade}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                            esp.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {esp.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {esp.dias_atendimento
                          .slice()
                          .sort((a, b) => a - b)
                          .map(d => DIAS_LABEL[d])
                          .join(', ')}
                        {' · '}
                        {esp.horario_inicio.slice(0, 5)}–{esp.horario_fim.slice(0, 5)}
                        {' · '}
                        {esp.duracao_atendimento}min
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(esp)}
                        className="p-2 rounded-xl border border-brand-100 text-brand-700 hover:bg-brand-50 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(esp.id)}
                        disabled={deleting === esp.id}
                        className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deleting === esp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FORM MODE */}
        {mode === 'form' && (
          <div className="p-6 space-y-5">
            {/* Nome e Especialidade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Dr. João Silva"
                />
                {errors.nome && (
                  <p className="text-red-500 text-xs mt-1">{errors.nome}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Especialidade
                </label>
                <input
                  type="text"
                  value={form.especialidade}
                  onChange={e => setForm(p => ({ ...p, especialidade: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Ex: Dentista, Cabeleireiro"
                />
              </div>
            </div>

            {/* Dias de atendimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias de Atendimento *
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DIAS_SEMANA.map(dia => {
                  const active = form.dias_atendimento.includes(dia.value)
                  return (
                    <button
                      key={dia.value}
                      type="button"
                      onClick={() => handleDia(dia.value)}
                      className={`py-2 rounded-xl text-sm font-medium transition border ${
                        active
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {dia.label}
                    </button>
                  )
                })}
              </div>
              {errors.dias && (
                <p className="text-red-500 text-xs mt-1">{errors.dias}</p>
              )}
            </div>

            {/* Horários */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Início *
                </label>
                <input
                  type="time"
                  value={form.horario_inicio}
                  onChange={e => setForm(p => ({ ...p, horario_inicio: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.horario_inicio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fim *
                </label>
                <input
                  type="time"
                  value={form.horario_fim}
                  onChange={e => setForm(p => ({ ...p, horario_fim: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.horario_fim ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.horario_fim && (
                  <p className="text-red-500 text-xs mt-1">{errors.horario_fim}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as 'ativo' | 'inativo' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            {/* Duração e Intervalo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Duração do Atendimento (min) *
                </label>
                <input
                  type="number"
                  value={form.duracao_atendimento}
                  onChange={e => setForm(p => ({ ...p, duracao_atendimento: parseInt(e.target.value) || 30 }))}
                  min={15}
                  step={15}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.duracao ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.duracao && (
                  <p className="text-red-500 text-xs mt-1">{errors.duracao}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intervalo entre Atendimentos (min)
                </label>
                <input
                  type="number"
                  value={form.intervalo_entre}
                  onChange={e => setForm(p => ({ ...p, intervalo_entre: parseInt(e.target.value) || 0 }))}
                  min={0}
                  step={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
