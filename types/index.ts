export interface Cliente {
  id: string
  nome: string
  ramo: string
  whatsapp: string
  email: string
  dias_atendimento: number[]
  horario_inicio: string
  horario_fim: string
  duracao_atendimento: number
  intervalo_entre: number
  observacoes?: string
  sigla: string
  status: 'ativo' | 'inativo'
  pode_agendar: boolean
  created_at: string
}

export interface Especialista {
  id: string
  cliente_id: string
  nome: string
  especialidade?: string
  dias_atendimento: number[]
  horario_inicio: string
  horario_fim: string
  duracao_atendimento: number
  intervalo_entre: number
  status: 'ativo' | 'inativo'
  created_at: string
}

export interface Agendamento {
  id: string
  cliente_id: string
  especialista_id?: string
  nome_paciente: string
  whatsapp_paciente: string
  data: string
  horario: string
  tipo_atendimento: string
  tipo_pagamento?: 'convenio' | 'particular'
  convenio_nome?: string
  observacao?: string
  status: 'agendado' | 'confirmado' | 'cancelado' | 'realizado'
  created_at: string
  cliente?: Cliente
  especialista?: Especialista
}

export type UserRole = 'admin' | 'cliente'

export interface User {
  id: string
  email: string
  senha: string
  role: UserRole
  cliente_id?: string
  nome: string
  created_at: string
}
