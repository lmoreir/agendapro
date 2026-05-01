'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Phone,
  Filter,
  Download,
} from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { AgendamentoModal } from '@/components/agendamento-modal'
import { exportAgendamentosToCSV } from '@/lib/export'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado: { label: 'Agendado', bg: 'bg-blue-100', text: 'text-blue-800' },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-green-100',
    text: 'text-green-800',
  },
  realizado: { label: 'Realizado', bg: 'bg-gray-100', text: 'text-gray-800' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800' },
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filtros
  const [filterClienteId, setFilterClienteId] = useState('')
  const [filterData, setFilterData] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('')

  const supabase = createClient()
  const { addToast } = useToast()

  // Carregar dados
  const loadData = async () => {
    setLoading(true)
    try {
      const [clientesRes, agendamentosRes] = await Promise.all([
        supabase.from('clientes').select('*').order('nome'),
        supabase
          .from('agendamentos')
          .select('*, clientes(id, nome, sigla, ramo)')
          .order('data', { ascending: true })
          .order('horario', { ascending: true }),
      ])

      if (clientesRes.error) throw clientesRes.error
      if (agendamentosRes.error) throw agendamentosRes.error

      setClientes(clientesRes.data || [])
      setAgendamentos(agendamentosRes.data as Agendamento[] || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Deletar agendamento
  const handleDeleteAgendamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este agendamento?')) return

    setDeleting(id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAgendamentos(prev => prev.filter(a => a.id !== id))
      addToast('Agendamento deletado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao deletar:', error)
      addToast('Erro ao deletar agendamento', 'error')
    } finally {
      setDeleting(null)
    }
  }

  // Abrir modal para editar
  const handleEditAgendamento = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento)
    setIsModalOpen(true)
  }

  // Abrir modal para novo
  const handleNovoAgendamento = () => {
    setSelectedAgendamento(null)
    setIsModalOpen(true)
  }

  // Exportar agendamentos
  const handleExportAgendamentos = () => {
    try {
      const data = agendamentosFiltrados.map(a => ({
        'Data': a.data,
        'Horário': formatarHorario(a.horario),
        'Paciente': a.nome_paciente,
        'WhatsApp': a.whatsapp_paciente,
        'Cliente': (a.clientes as any)?.nome || 'N/A',
        'Tipo': a.tipo_atendimento,
        'Status': a.status,
        'Observação': a.observacao || '',
      }))

      const filename = `agendamentos-${new Date().toISOString().split('T')[0]}`
      exportAgendamentosToCSV(agendamentosFiltrados, filename)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar agendamentos')
    }
  }

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAgendamento(null)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtrar agendamentos
  const agendamentosFiltrados = agendamentos.filter(a => {
    if (filterClienteId && a.cliente_id !== filterClienteId) return false
    if (filterData && a.data !== filterData) return false
    if (filterStatus && a.status !== filterStatus) return false
    return true
  })

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatarHorario = (horario: string) => {
    return horario.slice(0, 5)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600 mt-1">Gerencie seus agendamentos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportAgendamentos}
            disabled={loading || agendamentosFiltrados.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
          <button
            onClick={handleNovoAgendamento}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente
            </label>
            <select
              value={filterClienteId}
              onChange={e => setFilterClienteId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={filterData}
              onChange={e => setFilterData(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : agendamentosFiltrados.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum agendamento encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            {filterClienteId || filterData || filterStatus
              ? 'Tente ajustar os filtros'
              : 'Comece criando um novo agendamento'}
          </p>
          <button
            onClick={handleNovoAgendamento}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      ) : (
        /* Tabela de Agendamentos */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Data/Hora
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Paciente
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Tipo de Atendimento
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {agendamentosFiltrados.map(agendamento => {
                  const config = statusConfig[agendamento.status as keyof typeof statusConfig]
                  return (
                    <tr key={agendamento.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {formatarData(agendamento.data)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-500" />
                            {formatarHorario(agendamento.horario)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {(agendamento as any).clientes?.nome || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {(agendamento as any).clientes?.sigla}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <User className="w-4 h-4 text-gray-500" />
                            {agendamento.nome_paciente}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {agendamento.whatsapp_paciente}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {agendamento.tipo_atendimento}
                        </div>
                        {agendamento.observacao && (
                          <div className="text-xs text-gray-600 line-clamp-1">
                            {agendamento.observacao}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditAgendamento(agendamento)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgendamento(agendamento.id)}
                            disabled={deleting === agendamento.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title="Deletar"
                          >
                            {deleting === agendamento.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AgendamentoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadData}
        agendamento={selectedAgendamento}
        clientes={clientes}
      />
    </div>
  )
}
