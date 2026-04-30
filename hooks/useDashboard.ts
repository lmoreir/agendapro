'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agendamento, Cliente } from '@/types'

export interface DashboardStats {
  agendamentosHoje: number
  clientesAtivos: number
  estaSemana: number
  taxaConfirmacao: number
}

export interface AgendamentoHoje extends Omit<Agendamento, 'cliente'> {
  clientes: Pick<Cliente, 'nome' | 'sigla' | 'ramo'> | null
}

export interface ClienteBar {
  sigla: string
  nome: string
  total: number
}

export interface DashboardData {
  stats: DashboardStats
  proximosHoje: AgendamentoHoje[]
  barChart: ClienteBar[]
  loading: boolean
  error: string | null
}

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

const initialStats: DashboardStats = {
  agendamentosHoje: 0,
  clientesAtivos: 0,
  estaSemana: 0,
  taxaConfirmacao: 0,
}

export function useDashboard(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    stats: initialStats,
    proximosHoje: [],
    barChart: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient()
      const today    = new Date().toISOString().split('T')[0]
      const week     = getWeekRange()
      const month    = getMonthRange()

      const [
        { count: countHoje },
        { count: countAtivos },
        { count: countSemana },
        { data: todayList },
        { data: allNaoCancelados },
        { data: mesList },
      ] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('*', { count: 'exact', head: true })
          .eq('data', today),
        supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),
        supabase
          .from('agendamentos')
          .select('*', { count: 'exact', head: true })
          .gte('data', week.start)
          .lte('data', week.end),
        supabase
          .from('agendamentos')
          .select('*, clientes(nome, sigla, ramo)')
          .eq('data', today)
          .order('horario', { ascending: true }),
        supabase
          .from('agendamentos')
          .select('status')
          .neq('status', 'cancelado'),
        supabase
          .from('agendamentos')
          .select('cliente_id, clientes(nome, sigla)')
          .gte('data', month.start)
          .lte('data', month.end)
          .neq('status', 'cancelado'),
      ])

      // Taxa de confirmação
      const total       = allNaoCancelados?.length ?? 0
      const confirmados = allNaoCancelados?.filter(
        a => a.status === 'confirmado' || a.status === 'realizado'
      ).length ?? 0
      const taxaConfirmacao = total > 0 ? Math.round((confirmados / total) * 100) : 0

      // Bar chart agrupado por cliente
      const barMap = new Map<string, ClienteBar>()
      ;(mesList ?? []).forEach((row: any) => {
        if (!row.clientes) return
        const entry = barMap.get(row.cliente_id)
        if (entry) {
          entry.total++
        } else {
          barMap.set(row.cliente_id, {
            sigla: row.clientes.sigla,
            nome: row.clientes.nome,
            total: 1,
          })
        }
      })
      const barChart = Array.from(barMap.values()).sort((a, b) => b.total - a.total)

      setData({
        stats: {
          agendamentosHoje: countHoje   ?? 0,
          clientesAtivos:   countAtivos ?? 0,
          estaSemana:       countSemana ?? 0,
          taxaConfirmacao,
        },
        proximosHoje: (todayList ?? []) as AgendamentoHoje[],
        barChart,
        loading: false,
        error: null,
      })
    }

    fetchAll().catch(err =>
      setData(prev => ({ ...prev, loading: false, error: String(err.message) }))
    )
  }, [])

  return data
}
