'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, Calendar, Clock, User, Phone } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

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

export default function ClienteAgendaPage() {
  const { user } = useAuth()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.cliente_id) return

        // Buscar dados do cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', user.cliente_id)
          .single()

        if (clienteError) throw clienteError

        setCliente(clienteData)

        // Buscar agendamentos do cliente
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('cliente_id', user.cliente_id)
          .gte('data', new Date().toISOString().split('T')[0])
          .order('data', { ascending: true })
          .order('horario', { ascending: true })

        if (agendamentosError) throw agendamentosError

        setAgendamentos(agendamentosData || [])
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, supabase])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Informações do Cliente */}
      {cliente && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informações do Negócio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Nome</p>
              <p className="text-lg font-semibold text-gray-900">{cliente.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ramo de Atividade</p>
              <p className="text-lg font-semibold text-gray-900">{cliente.ramo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Sigla</p>
              <p className="text-lg font-semibold text-blue-600">{cliente.sigla}</p>
            </div>
          </div>
        </div>
      )}

      {/* Agendamentos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Próximos Agendamentos
        </h2>

        {agendamentos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum agendamento futuro
            </h3>
            <p className="text-gray-600">
              Você não tem agendamentos futuros no momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {agendamentos.map(agendamento => {
              const config = statusConfig[agendamento.status as keyof typeof statusConfig]
              return (
                <div
                  key={agendamento.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {agendamento.nome_paciente}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {agendamento.tipo_atendimento}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {formatarData(agendamento.data)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {formatarHorario(agendamento.horario)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {agendamento.whatsapp_paciente}
                      </span>
                    </div>
                    {agendamento.observacao && (
                      <div className="bg-gray-50 rounded p-3 mt-4">
                        <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                          Observações
                        </p>
                        <p className="text-sm text-gray-700">{agendamento.observacao}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
