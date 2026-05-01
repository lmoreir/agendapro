'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Download,
} from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { exportRelatorioToCSV } from '@/lib/export'
import { useToast } from '@/hooks/useToast'

interface EstatisticasRelatorio {
  total: number
  confirmados: number
  realizados: number
  cancelados: number
  pendentes: number
  taxaConfirmacao: number
  taxaCancelamento: number
}

interface ClienteComEstatisticas extends Cliente {
  totalAgendamentos: number
  confirmados: number
  realizados: number
  cancelados: number
}

export default function RelatoriosPage() {
  const [stats, setStats] = useState<EstatisticasRelatorio | null>(null)
  const [clientesStats, setClientesStats] = useState<ClienteComEstatisticas[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const { addToast } = useToast()

  const supabase = createClient()

  const handleExportRelatorio = () => {
    try {
      if (!stats) return

      const data = [
        {
          'Métrica': 'Total de Agendamentos',
          'Valor': stats.total,
        },
        {
          'Métrica': 'Confirmados',
          'Valor': stats.confirmados,
        },
        {
          'Métrica': 'Realizados',
          'Valor': stats.realizados,
        },
        {
          'Métrica': 'Pendentes',
          'Valor': stats.pendentes,
        },
        {
          'Métrica': 'Cancelados',
          'Valor': stats.cancelados,
        },
        {
          'Métrica': 'Taxa de Confirmação (%)',
          'Valor': stats.taxaConfirmacao,
        },
        {
          'Métrica': 'Taxa de Cancelamento (%)',
          'Valor': stats.taxaCancelamento,
        },
      ]

      exportRelatorioToCSV(data, `relatorio-${new Date().toISOString().split('T')[0]}`)
      addToast('Relatório exportado com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      addToast('Erro ao exportar relatório', 'error')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // Buscar todos os agendamentos
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select('*')

        if (agendamentosError) throw agendamentosError

        const agendamentos = agendamentosData || []

        // Buscar todos os clientes
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')

        if (clientesError) throw clientesError

        const clientes = clientesData || []

        // Calcular estatísticas gerais
        const total = agendamentos.length
        const confirmados = agendamentos.filter(
          a => a.status === 'confirmado' || a.status === 'realizado'
        ).length
        const realizados = agendamentos.filter(a => a.status === 'realizado').length
        const cancelados = agendamentos.filter(a => a.status === 'cancelado').length
        const pendentes = agendamentos.filter(a => a.status === 'agendado').length

        const taxaConfirmacao = total > 0 ? Math.round((confirmados / total) * 100) : 0
        const taxaCancelamento = total > 0 ? Math.round((cancelados / total) * 100) : 0

        setStats({
          total,
          confirmados,
          realizados,
          cancelados,
          pendentes,
          taxaConfirmacao,
          taxaCancelamento,
        })

        // Calcular estatísticas por cliente
        const clientesComStats: ClienteComEstatisticas[] = clientes.map(cliente => {
          const agendamentosCliente = agendamentos.filter(
            a => a.cliente_id === cliente.id
          )
          const confirmadosCliente = agendamentosCliente.filter(
            a => a.status === 'confirmado' || a.status === 'realizado'
          ).length
          const realizadosCliente = agendamentosCliente.filter(
            a => a.status === 'realizado'
          ).length
          const canceladosCliente = agendamentosCliente.filter(
            a => a.status === 'cancelado'
          ).length

          return {
            ...cliente,
            totalAgendamentos: agendamentosCliente.length,
            confirmados: confirmadosCliente,
            realizados: realizadosCliente,
            cancelados: canceladosCliente,
          }
        })

        setClientesStats(clientesComStats.sort((a, b) => b.totalAgendamentos - a.totalAgendamentos))
      } catch (error) {
        console.error('Erro ao carregar relatório:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">Erro ao carregar relatório</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Análise de agendamentos e desempenho</p>
        </div>
        <button
          onClick={handleExportRelatorio}
          disabled={loading || !stats}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total de Agendamentos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total de Agendamentos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Taxa de Confirmação */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Taxa de Confirmação</p>
              <p className="text-3xl font-bold text-gray-900">{stats.taxaConfirmacao}%</p>
              <p className="text-xs text-gray-600 mt-2">
                {stats.confirmados} confirmados
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Taxa de Cancelamento */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Taxa de Cancelamento</p>
              <p className="text-3xl font-bold text-gray-900">{stats.taxaCancelamento}%</p>
              <p className="text-xs text-gray-600 mt-2">
                {stats.cancelados} cancelados
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Realizados */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-gray-100 p-2 rounded">
              <CheckCircle2 className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="font-medium text-gray-900">Realizados</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.realizados}</p>
        </div>

        {/* Confirmados */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Confirmados</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.confirmados}</p>
        </div>

        {/* Pendentes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Pendentes</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pendentes}</p>
        </div>

        {/* Cancelados */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 p-2 rounded">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-medium text-gray-900">Cancelados</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.cancelados}</p>
        </div>
      </div>

      {/* Relatório por Cliente */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Agendamentos por Cliente
        </h2>

        {clientesStats.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nenhum cliente encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Ramo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Realizados
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Confirmados
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Cancelados
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Taxa de Confirmação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientesStats.map(cliente => {
                  const taxaConfirmacao =
                    cliente.totalAgendamentos > 0
                      ? Math.round(
                          ((cliente.confirmados + cliente.realizados) /
                            cliente.totalAgendamentos) *
                            100
                        )
                      : 0
                  return (
                    <tr key={cliente.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{cliente.nome}</div>
                        <div className="text-xs text-gray-600 mt-1">{cliente.sigla}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cliente.ramo}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {cliente.totalAgendamentos}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {cliente.realizados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {cliente.confirmados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {cliente.cancelados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${taxaConfirmacao}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12">
                            {taxaConfirmacao}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
