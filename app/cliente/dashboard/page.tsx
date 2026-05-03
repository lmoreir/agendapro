'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, TrendingUp, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Agendamento, Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

const statusConfig = {
  agendado:   { label: 'Agendado',   bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmado: { label: 'Confirmado', bg: 'bg-green-100',  text: 'text-green-800'  },
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

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-700" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] bg-gradient-to-r from-brand-700 to-brand-900 text-white p-8 shadow-[0_30px_90px_-40px_rgba(17,24,39,0.65)]">
        <p className="text-sm uppercase tracking-[0.36em] text-brand-200/80">Dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold">{cliente?.nome ?? 'Meu Dashboard'}</h1>
        <p className="mt-2 text-sm text-brand-100/80">{cliente?.ramo}</p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-brand-600" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Próximos</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{proximos.length}</p>
          <p className="text-xs text-gray-400 mt-1">agendamentos futuros</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hoje</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{agendamentosHoje.length}</p>
          <p className="text-xs text-gray-400 mt-1">agendamentos hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmados</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{taxaConfirmacao}%</p>
          <p className="text-xs text-gray-400 mt-1">taxa de confirmação</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{agendamentos.length}</p>
          <p className="text-xs text-gray-400 mt-1">todos os registros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximo agendamento */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Próximo agendamento</h2>
          {proximoAg ? (
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-4">
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

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Resumo por status</h2>
          <div className="space-y-2">
            {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => {
              const count = agendamentos.filter(a => a.status === key).length
              const pct = agendamentos.length > 0 ? Math.round((count / agendamentos.length) * 100) : 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-20 text-center ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Próximos 5 agendamentos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Próximos agendamentos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum agendamento futuro</p>
        ) : (
          <div className="space-y-2">
            {proximos.slice(0, 8).map(ag => {
              const cfg = statusConfig[ag.status]
              return (
                <div key={ag.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border-l-[3px] ${cfg.bg}`} style={{ borderLeftColor: '' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ag.nome_paciente}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatarData(ag.data)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatarHorario(ag.horario)}</span>
                      {ag.tipo_atendimento && <span>{ag.tipo_atendimento}</span>}
                    </div>
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
