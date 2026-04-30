# AgendaPro

Sistema de agendamento online com Next.js 14, Supabase e Tailwind CSS.

## Stack

- **Next.js 14** — App Router + TypeScript
- **Tailwind CSS** — estilização
- **Supabase** — autenticação e banco de dados (PostgreSQL)
- **Vercel** — deploy

## Setup local

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Preencha `.env.local` com os valores do seu projeto Supabase:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |

### 3. Crie as tabelas no Supabase

No painel do Supabase, acesse **SQL Editor** e execute o conteúdo de `schema.sql`.

### 4. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura de pastas

```
agendapro/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Layout com navegação
│   │   ├── dashboard/page.tsx  # Visão geral
│   │   ├── agenda/page.tsx     # Calendário de agendamentos
│   │   ├── clientes/page.tsx   # Gestão de clientes
│   │   ├── whatsapp/page.tsx   # Integração WhatsApp
│   │   └── relatorios/page.tsx # Relatórios e métricas
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
│       ├── client.ts   # Cliente browser (componentes client)
│       └── server.ts   # Cliente server (Server Components / Route Handlers)
├── types/
│   └── index.ts        # Interfaces: Cliente, Agendamento
├── schema.sql          # SQL para criar as tabelas no Supabase
└── .env.local          # Variáveis de ambiente (não versionar)
```

## Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente no painel da Vercel
4. Deploy automático a cada push na branch `main`
