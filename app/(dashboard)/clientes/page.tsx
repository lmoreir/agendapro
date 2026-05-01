'use client'

import { useEffect, useState } from 'react'
import { Plus, Loader2, Trash2, Edit2, AlertCircle } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { ClientModal } from '@/components/client-modal'

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

  // Carregar clientes
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
    } finally {
      setLoading(false)
    }
  }

  // Deletar cliente
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
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      alert('Erro ao deletar cliente')
    } finally {
      setDeleting(null)
    }
  }

  // Abrir modal para editar
  const handleEditClient = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setIsModalOpen(true)
  }

  // Abrir modal para novo
  const handleNovoClient = () => {
    setSelectedCliente(null)
    setIsModalOpen(true)
  }

  // Fechar modal
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todos os seus clientes
          </p>
        </div>
        <button
          onClick={handleNovoClient}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : clientes.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece criando um novo cliente para organizar seus agendamentos
          </p>
          <button
            onClick={handleNovoClient}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Cliente
          </button>
        </div>
      ) : (
        /* Grid de Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div
              key={cliente.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cliente.nome}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {cliente.ramo}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cliente.status === 'ativo'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {cliente.status === 'ativo' ? 'Ativo' : 'Onboarding'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Sigla */}
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">
                    Sigla
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {cliente.sigla}
                  </p>
                </div>

                {/* Informações de Contato */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">WhatsApp:</span>{' '}
                    {cliente.whatsapp}
                  </p>
                  {cliente.email && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Email:</span>{' '}
                      {cliente.email}
                    </p>
                  )}
                </div>

                {/* Dias de Atendimento */}
                <div>
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                    Dias
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatarDias(cliente.dias_atendimento)}
                  </p>
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                      Início
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatarHorario(cliente.horario_inicio)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                      Fim
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatarHorario(cliente.horario_fim)}
                    </p>
                  </div>
                </div>

                {/* Duração e Intervalo */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-600 mb-1">
                      <span className="font-medium">Duração:</span>{' '}
                      {cliente.duracao_atendimento}min
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">Intervalo:</span>{' '}
                      {cliente.intervalo_entre}min
                    </p>
                  </div>
                </div>

                {/* Observações */}
                {cliente.observacoes && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                      Observações
                    </p>
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {cliente.observacoes}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleEditClient(cliente)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClient(cliente.id)}
                  disabled={deleting === cliente.id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium transition disabled:opacity-50"
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

      {/* Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadClientes}
        cliente={selectedCliente}
      />
    </div>
  )
}
