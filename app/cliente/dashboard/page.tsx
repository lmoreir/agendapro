'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, TrendingUp, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado:   { label: 'Agendado',   bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmado: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  realizado:  { label: 'Realizado',  bg: 'bg-gray-100',   text: 'text-gray-600'   },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700'    },
}

export default function ClienteDashboardPage() {
  const { user } = useAuth()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    if (!user?.cliente_id) return
    const load = async () => {
      try {
        const [clienteRes, agRes] = await Promise.all([
          supabase.from('clientes').select('*').eq('id', user.cliente_id).single(),
          supabase.from('agendamentos').select('*').eq('cliente_id', user.cliente_id)
            .order('data', { ascending: true }).order('horario', { ascending: true }),
        ])
        if (clienteRes.data) setCliente(clienteRes.data)
        if (agRes.data) setAgendamentos(agRes.data)
      } catch { addToast('Erro ao carregar dados', 'error') }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const hoje = new Date().toISOString().split('T')[0]

  const proximos = useMemo(() =>
    agendamentos
      .filter(a => a.data >= hoje && a.status !== 'cancelado')
      .sort((a, b) => `${a.data}${a.horario}` < `${b.data}${b.horario}` ? -1 : 1),
    [agendamentos, hoje])

  const agendamentosHoje = useMemo(() => agendamentos.filter(a => a.data === hoje), [agendamentos, hoje])

  const proximoAg = proximos[0]

  const taxaConfirmacao = useMemo(() => {
    const total = agendamentos.filter(a => a.status !== 'cancelado').length
    const confirmados = agendamentos.filter(a => a.status === 'confirmado' || a.status === 'realizado').length
    return total > 0 ? Math.round((confirmados / total) * 100) : 0
  }, [agendamentos])

  const formatarData = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const formatarHorario = (h: string) => h.slice(0, 5)

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] bg-gradient-to-r from-brand-700 to-brand-900 text-white overflow-hidden shadow-[0_30px_90px_-40px_rgba(17,24,39,0.65)]">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-sm uppercase tracking-[0.36em] text-brand-200/80">Dashboard</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            {cliente?.nome ?? 'Meu Dashboard'}
          </h1>
          <p className="mt-2 text-sm text-brand-100/80">{cliente?.ramo}</p>
        </div>
        <div className="grid gap-4 px-6 pb-8 sm:grid-cols-2 sm:px-10">
          <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
            <p className="text-sm text-brand-100 mb-2">Agendamentos hoje</p>
            <p className="text-3xl font-semibold">{agendamentosHoje.length}</p>
          </div>
          <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
            <p className="text-sm text-brand-100 mb-2">Próximos agendamentos</p>
            <p className="text-3xl font-semibold">{proximos.length}</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="bg-brand-100 rounded-2xl p-3 flex-shrink-0">
            <Calendar className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Próximos</p>
            <p className="text-2xl font-bold text-brand-700">{proximos.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="bg-sky-100 rounded-2xl p-3 flex-shrink-0">
            <Clock className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Hoje</p>
            <p className="text-2xl font-bold text-sky-700">{agendamentosHoje.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="bg-emerald-100 rounded-2xl p-3 flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Confirmação</p>
            <p className="text-2xl font-bold text-emerald-700">{taxaConfirmacao}%</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="bg-violet-100 rounded-2xl p-3 flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-violet-700">{agendamentos.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximo agendamento */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Próximo agendamento</h2>
          {proximoAg ? (
            <div className="rounded-3xl bg-brand-50 border border-brand-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">{proximoAg.nome_paciente}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig[proximoAg.status]?.bg} ${statusConfig[proximoAg.status]?.text}`}>
                  {statusConfig[proximoAg.status]?.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatarData(proximoAg.data)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatarHorario(proximoAg.horario)}</span>
              </div>
              {proximoAg.tipo_atendimento && <p className="text-xs text-gray-500 mt-1">{proximoAg.tipo_atendimento}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhum agendamento futuro</p>
            </div>
          )}
        </div>

        {/* Resumo por status */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Resumo por status</h2>
          <div className="space-y-3">
            {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => {
              const count = agendamentos.filter(a => a.status === key).length
              const pct = agendamentos.length > 0 ? Math.round((count / agendamentos.length) * 100) : 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Próximos agendamentos */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Próximos agendamentos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Os próximos 8 confirmados</p>
        </div>
        {proximos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum agendamento futuro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Horário</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Paciente</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proximos.slice(0, 8).map(ag => {
                  const cfg = statusConfig[ag.status]
                  return (
                    <tr key={ag.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-700">{formatarData(ag.data)}</td>
                      <td className="px-6 py-3 font-mono text-gray-700">{formatarHorario(ag.horario)}</td>
                      <td className="px-6 py-3 text-gray-800">{ag.nome_paciente}</td>
                      <td className="px-6 py-3 text-gray-600">{ag.tipo_atendimento}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
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
