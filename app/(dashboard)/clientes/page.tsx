'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Loader2, Trash2, Edit2, AlertCircle, Download } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { ClientModal } from '@/components/client-modal'
import { exportToCSV } from '@/lib/export'
import { useToast } from '@/hooks/useToast'

const DIAS_SEMANA_MAP: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()
  const { addToast } = useToast()

  const ativosCount = useMemo(
    () => clientes.filter(cliente => cliente.status === 'ativo').length,
    [clientes]
  )
  const onboardingCount = clientes.length - ativosCount

  const loadClientes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      addToast('Erro ao carregar clientes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) return

    setDeleting(id)
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setClientes(prev => prev.filter(c => c.id !== id))
      addToast('Cliente deletado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      addToast('Erro ao deletar cliente', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleEditClient = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setIsModalOpen(true)
  }

  const handleNovoClient = () => {
    setSelectedCliente(null)
    setIsModalOpen(true)
  }

  const handleExportClientes = () => {
    try {
      const data = clientes.map(cliente => ({
        'Nome': cliente.nome,
        'Sigla': cliente.sigla,
        'Ramo': cliente.ramo,
        'WhatsApp': cliente.whatsapp,
        'Email': cliente.email,
        'Dias': formatarDias(cliente.dias_atendimento),
        'Horário Início': formatarHorario(cliente.horario_inicio),
        'Horário Fim': formatarHorario(cliente.horario_fim),
        'Duração (min)': cliente.duracao_atendimento,
        'Intervalo (min)': cliente.intervalo_entre,
        'Status': cliente.status,
      }))

      exportToCSV(data, `clientes-${new Date().toISOString().split('T')[0]}`)
      addToast('Clientes exportados com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      addToast('Erro ao exportar clientes', 'error')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCliente(null)
  }

  useEffect(() => {
    loadClientes()
  }, [])

  const formatarDias = (dias: number[]) => {
    if (!dias || dias.length === 0) return 'N/A'
    const diasOrdenados = [...dias].sort((a, b) => a - b)
    return diasOrdenados.map(d => DIAS_SEMANA_MAP[d] || '').filter(Boolean).join(', ')
  }

  const formatarHorario = (hora: string) => {
    if (!hora) return 'N/A'
    return hora.slice(0, 5)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Clientes</p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-900">Painel de clientes</h1>
            <p className="mt-3 text-gray-600 leading-7">
              Visualize seu portfólio de clientes, acompanhe o status e acesse ações rápidas para cadastrar e exportar dados.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-[18rem] sm:grid-cols-3">
            <div className="rounded-3xl bg-brand-50 border border-brand-100 p-4 text-center">
              <p className="text-xs text-brand-700 uppercase tracking-[0.2em]">Total</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{clientes.length}</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-4 text-center">
              <p className="text-xs text-emerald-700 uppercase tracking-[0.2em]">Ativos</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{ativosCount}</p>
            </div>
            <div className="rounded-3xl bg-yellow-50 border border-yellow-100 p-4 text-center">
              <p className="text-xs text-yellow-700 uppercase tracking-[0.2em]">Onboarding</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{onboardingCount}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-gray-900">Clientes cadastrados</p>
          <p className="text-sm text-gray-500">Edite, exclua ou exporte informações rápidas.</p>
        </div>
        <button
          onClick={handleExportClientes}
          disabled={loading || clientes.length === 0}
          className="inline-flex items-center gap-2 justify-center bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
          <p className="text-gray-600 mb-6">Comece criando um novo cliente para organizar seus agendamentos com clareza.</p>
          <button
            onClick={handleNovoClient}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div
              key={cliente.id}
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1 truncate">{cliente.ramo}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      cliente.status === 'ativo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {cliente.status === 'ativo' ? 'Ativo' : 'Onboarding'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-brand-50 rounded-3xl p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.21em] text-brand-700">Sigla</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-900">{cliente.sigla}</p>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-900">WhatsApp:</span>{' '}
                    {cliente.whatsapp}
                  </p>
                  {cliente.email && (
                    <p>
                      <span className="font-semibold text-gray-900">Email:</span>{' '}
                      {cliente.email}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-gray-50 rounded-3xl p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Dias</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{formatarDias(cliente.dias_atendimento)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Horário</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{formatarHorario(cliente.horario_inicio)} — {formatarHorario(cliente.horario_fim)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                  <div className="rounded-3xl bg-gray-50 p-3">
                    <p>Duração</p>
                    <p className="mt-1 font-semibold text-gray-900">{cliente.duracao_atendimento}min</p>
                  </div>
                  <div className="rounded-3xl bg-gray-50 p-3">
                    <p>Intervalo</p>
                    <p className="mt-1 font-semibold text-gray-900">{cliente.intervalo_entre}min</p>
                  </div>
                </div>

                {cliente.observacoes && (
                  <div className="bg-gray-50 rounded-3xl p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900 mb-1">Observações</p>
                    <p className="line-clamp-3">{cliente.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleEditClient(cliente)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-3xl border border-brand-100 px-3 py-2 text-brand-700 hover:bg-brand-50 transition font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClient(cliente.id)}
                  disabled={deleting === cliente.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-3xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 transition font-medium disabled:opacity-50"
                >
                  {deleting === cliente.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadClientes}
        cliente={selectedCliente}
      />
    </div>
  )
}
