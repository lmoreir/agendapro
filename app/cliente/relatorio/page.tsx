'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface EstatisticasRelatorio {
  total: number
  confirmados: number
  realizados: number
  cancelados: number
  pendentes: number
  taxaConfirmacao: number
  taxaCancelamento: number
}

interface AgendamentoPorMes {
  mes: string
  total: number
  confirmados: number
  realizados: number
  cancelados: number
}

export default function ClienteRelatorioPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<EstatisticasRelatorio | null>(null)
  const [agendamentosPorMes, setAgendamentosPorMes] = useState<AgendamentoPorMes[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.cliente_id) return

        // Buscar cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', user.cliente_id)
          .single()

        if (clienteError) throw clienteError
        setCliente(clienteData)

        // Buscar todos os agendamentos do cliente (sem filtro de data)
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('cliente_id', user.cliente_id)
          .order('data', { ascending: false })

        if (agendamentosError) throw agendamentosError

        const agendamentos = agendamentosData || []

        // Calcular estatísticas
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

        // Agrupar por mês
        const mesesMap = new Map<string, AgendamentoPorMes>()
        agendamentos.forEach(agendamento => {
          const data = new Date(agendamento.data)
          const mes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          const mesKey = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`

          if (!mesesMap.has(mesKey)) {
            mesesMap.set(mesKey, {
              mes,
              total: 0,
              confirmados: 0,
              realizados: 0,
              cancelados: 0,
            })
          }

          const mesData = mesesMap.get(mesKey)!
          mesData.total++
          if (agendamento.status === 'confirmado' || agendamento.status === 'realizado') {
            mesData.confirmados++
          }
          if (agendamento.status === 'realizado') {
            mesData.realizados++
          }
          if (agendamento.status === 'cancelado') {
            mesData.cancelados++
          }
        })

        // Converter para array e ordenar
        const mesesArray = Array.from(mesesMap.values()).reverse()
        setAgendamentosPorMes(mesesArray)
      } catch (error) {
        console.error('Erro ao carregar relatório:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, supabase])

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
                {stats.confirmados} de {stats.total} confirmados
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
                {stats.cancelados} de {stats.total} cancelados
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

      {/* Gráfico de Evolução por Mês */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Evolução por Mês
        </h2>

        {agendamentosPorMes.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nenhum agendamento encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Mês
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
                    % Confirmação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {agendamentosPorMes.map((mes, idx) => {
                  const taxaConfirmacaoMes =
                    mes.total > 0
                      ? Math.round(((mes.confirmados + mes.realizados) / mes.total) * 100)
                      : 0
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {mes.mes}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{mes.total}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {mes.realizados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {mes.confirmados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {mes.cancelados}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${taxaConfirmacaoMes}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12">
                            {taxaConfirmacaoMes}%
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
