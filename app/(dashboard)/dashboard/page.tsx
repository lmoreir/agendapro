'use client'

import { useDashboard, type AgendamentoHoje, type ClienteBar } from '@/hooks/useDashboard'
import {
  CalendarCheck,
  Users,
  TrendingUp,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: 'indigo' | 'emerald' | 'sky' | 'violet'
}

const colorMap = {
  indigo: { bg: 'bg-brand-100', icon: 'text-brand-600', value: 'text-brand-700' },
  emerald:{ bg: 'bg-brand-100', icon: 'text-brand-600', value: 'text-brand-700' },
  sky:    { bg: 'bg-brand-100', icon: 'text-brand-600', value: 'text-brand-700' },
  violet: { bg: 'bg-brand-100', icon: 'text-brand-600', value: 'text-brand-700' },
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`${c.bg} rounded-lg p-3 flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusConfig = {
  agendado:  { label: 'Agendado',   cls: 'bg-brand-100 text-brand-700'   },
  confirmado:{ label: 'Confirmado', cls: 'bg-brand-100 text-brand-700' },
  cancelado: { label: 'Cancelado',  cls: 'bg-brand-100 text-brand-700' },
  realizado: { label: 'Realizado',  cls: 'bg-brand-100 text-brand-700'  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg?.cls ?? 'bg-gray-100 text-gray-600'}`}>
      {cfg?.label ?? status}
    </span>
  )
}

// ─── Agendamentos List ────────────────────────────────────────────────────────

function AgendamentosHoje({ items, loading }: { items: AgendamentoHoje[]; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Agendamentos de hoje</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
          <CalendarCheck className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhum agendamento para hoje</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Horário</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Paciente</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Tipo</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(ag => (
                <tr key={ag.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-gray-700 font-medium">
                    {ag.horario.slice(0, 5)}
                  </td>
                  <td className="px-5 py-3 text-gray-800">{ag.nome_paciente}</td>
                  <td className="px-5 py-3">
                    {ag.clientes ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="bg-brand-100 text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded">
                          {ag.clientes.sigla}
                        </span>
                        <span className="text-gray-500 hidden xl:inline">{ag.clientes.nome}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{ag.tipo_atendimento}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={ag.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data, loading }: { data: ClienteBar[]; loading: boolean }) {
  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Agendamentos por cliente</h2>
        <p className="text-xs text-gray-400 mt-0.5">Mês atual</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
          <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Sem dados este mês</p>
        </div>
      ) : (
        <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
          {data.map(item => (
            <div key={item.sigla} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-brand-100 text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                    {item.sigla}
                  </span>
                  <span className="text-gray-600 truncate">{item.nome}</span>
                </div>
                <span className="font-semibold text-gray-800 ml-3 flex-shrink-0">{item.total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(item.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, proximosHoje, barChart, loading } = useDashboard()

  const cards: StatCardProps[] = [
    {
      label: 'Agendamentos hoje',
      value: loading ? '...' : stats.agendamentosHoje,
      icon:  CalendarCheck,
      color: 'indigo',
    },
    {
      label: 'Clientes ativos',
      value: loading ? '...' : stats.clientesAtivos,
      icon:  Users,
      color: 'emerald',
    },
    {
      label: 'Esta semana',
      value: loading ? '...' : stats.estaSemana,
      icon:  TrendingUp,
      color: 'sky',
    },
    {
      label: 'Taxa de confirmação',
      value: loading ? '...' : `${stats.taxaConfirmacao}%`,
      icon:  CheckCircle,
      color: 'violet',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AgendamentosHoje items={proximosHoje} loading={loading} />
        <BarChart data={barChart} loading={loading} />
      </div>
    </div>
  )
}
