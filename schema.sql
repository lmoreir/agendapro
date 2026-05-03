-- =====================================================
-- AgendaPro — Schema SQL para Supabase
-- =====================================================

-- Extensão para UUID
create extension if not exists "pgcrypto";

-- =====================================================
-- Tabela: clientes
-- =====================================================
create table if not exists public.clientes (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  ramo                 text not null,
  whatsapp             text not null,
  email                text,
  dias_atendimento     int[] not null default '{}',
  horario_inicio       time not null,
  horario_fim          time not null,
  duracao_atendimento  int not null default 30,  -- em minutos
  intervalo_entre      int not null default 0,   -- em minutos
  observacoes          text,
  sigla                text not null,
  status               text not null default 'ativo' check (status in ('ativo', 'inativo')),
  pode_agendar         boolean not null default false,
  created_at           timestamptz not null default now()
);

-- Migração para bases existentes (execute no Supabase SQL Editor):
-- alter table public.clientes add column if not exists pode_agendar boolean not null default false;

comment on column public.clientes.dias_atendimento is
  '0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab';

-- =====================================================
-- Tabela: agendamentos
-- =====================================================
create table if not exists public.agendamentos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  nome_paciente     text not null,
  whatsapp_paciente text not null,
  data              date not null,
  horario           time not null,
  tipo_atendimento  text not null,
  tipo_pagamento    text check (tipo_pagamento in ('convenio', 'particular')),
  convenio_nome     text,
  observacao        text,
  status            text not null default 'agendado'
                      check (status in ('agendado', 'confirmado', 'cancelado', 'realizado')),
  created_at        timestamptz not null default now()
);

-- Migração para bases existentes (execute no Supabase SQL Editor):
-- alter table public.agendamentos add column if not exists tipo_pagamento text check (tipo_pagamento in ('convenio', 'particular'));
-- alter table public.agendamentos add column if not exists convenio_nome text;

-- =====================================================
-- Índices
-- =====================================================
create index if not exists idx_agendamentos_cliente_id on public.agendamentos(cliente_id);
create index if not exists idx_agendamentos_data      on public.agendamentos(data);
create index if not exists idx_agendamentos_status    on public.agendamentos(status);
create index if not exists idx_clientes_status        on public.clientes(status);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
alter table public.clientes     enable row level security;
alter table public.agendamentos enable row level security;

-- Políticas permissivas para usuários autenticados (ajuste conforme sua lógica de multi-tenant)
create policy "Autenticados podem ler clientes"
  on public.clientes for select
  using (auth.role() = 'authenticated');

create policy "Autenticados podem inserir clientes"
  on public.clientes for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar clientes"
  on public.clientes for update
  using (auth.role() = 'authenticated');

create policy "Autenticados podem ler agendamentos"
  on public.agendamentos for select
  using (auth.role() = 'authenticated');

create policy "Autenticados podem inserir agendamentos"
  on public.agendamentos for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar agendamentos"
  on public.agendamentos for update
  using (auth.role() = 'authenticated');

-- =====================================================
-- Tabela: usuarios
-- =====================================================
create table if not exists public.usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  senha       text not null,
  role        text not null default 'cliente'
                check (role in ('admin', 'cliente')),
  cliente_id  uuid references public.clientes(id) on delete cascade,
  nome        text not null,
  status      text not null default 'ativo'
                check (status in ('ativo', 'inativo')),
  created_at  timestamptz not null default now()
);

alter table public.usuarios enable row level security;

create policy "Usuarios acessivel via anon"
  on public.usuarios for all
  using (true) with check (true);

-- Seed: admin padrão (execute no Supabase SQL Editor)
-- insert into public.usuarios (email, senha, role, nome) values
--   ('admin@agendapro.com', 'admin123', 'admin', 'Administrador')
-- on conflict (email) do nothing;
