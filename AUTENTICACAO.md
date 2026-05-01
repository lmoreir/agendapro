# 🔐 Sistema de Autenticação - AgendaPro

## Estrutura de Acesso

O sistema AgendaPro possui **duas visões completamente diferentes** baseadas no tipo de usuário:

### 1. **ADMIN** - Visualização Completa
Acesso a todas as funcionalidades:
- ✅ **Dashboard**: Estatísticas gerais, próximos agendamentos, gráficos
- ✅ **Agenda**: Listar, criar, editar e deletar agendamentos de TODOS os clientes
- ✅ **Clientes**: Gerenciar clientes (CRUD)
- ✅ **Relatórios**: Ver evolução de agendamentos de todos os clientes
- ✅ **WhatsApp**: Integração com WhatsApp (em desenvolvimento)

### 2. **CLIENTE** - Visão Restrita
Acesso apenas a suas informações:
- ✅ **Minha Agenda**: Ver apenas seus agendamentos futuros
- ✅ **Relatório**: Ver evolução de seus agendamentos com gráficos

---

## 📋 Credenciais de Teste

### Admin
```
Email: admin@agendapro.com
Senha: admin123
```

### Cliente 1 - Clínica Saúde
```
Email: clinica@agendapro.com
Senha: clinica123
```

### Cliente 2 - Consultório Dr. Silva
```
Email: consultorio@agendapro.com
Senha: consultorio123
```

---

## 🗂️ Estrutura de Pastas

```
app/
├── page.tsx                    # Redirecionamento automático
├── login/
│   └── page.tsx               # Página de login
├── (dashboard)/               # Layout protegido para ADMIN
│   ├── layout.tsx
│   ├── dashboard/
│   ├── agenda/
│   ├── clientes/
│   ├── relatorios/
│   └── whatsapp/
└── cliente/                   # Layout protegido para CLIENTE
    ├── layout.tsx
    ├── agenda/
    └── relatorio/

components/
├── client-modal.tsx           # Modal de cadastro de clientes
├── agendamento-modal.tsx      # Modal de novo/editar agendamento
├── sidebar.tsx                # Sidebar do admin
├── topbar.tsx                 # Topbar do admin
├── cliente-sidebar.tsx        # Sidebar do cliente
└── cliente-topbar.tsx         # Topbar do cliente

hooks/
├── useAuth.ts                 # Hook de autenticação (novo)
└── useDashboard.ts
```

---

## 🔄 Fluxo de Autenticação

1. **Acesso à raiz** (`/`) → Verifica se está autenticado
2. **Se NÃO autenticado** → Redireciona para `/login`
3. **Se ADMIN** → Redireciona para `/dashboard`
4. **Se CLIENTE** → Redireciona para `/cliente/agenda`
5. **Login** → Armazena user no `localStorage` e faz login via `useAuth`
6. **Logout** → Remove user do `localStorage` e redireciona para login

---

## 🛡️ Proteção de Rotas

- **Dashboard e páginas admin** (`/dashboard`, `/agenda`, `/clientes`, `/relatorios`, `/whatsapp`)
  - Protegidas no `layout.tsx` com verificação de `role === 'admin'`
  
- **Páginas cliente** (`/cliente/agenda`, `/cliente/relatorio`)
  - Protegidas no `layout.tsx` com verificação de `role === 'cliente'`

---

## 📊 Relatórios

### Admin - Relatório Geral (`/relatorios`)
- **Estatísticas Globais**: Total, confirmação, cancelamento
- **Por Cliente**: Tabela com todos os clientes e seus agendamentos
- Gráficos de progresso

### Cliente - Relatório Pessoal (`/cliente/relatorio`)
- **Estatísticas Pessoais**: Total de seus agendamentos
- **Por Mês**: Evolução mensal com gráficos
- Taxa de confirmação e cancelamento

---

## 🔑 Dados Armazenados

### localStorage
```javascript
{
  "agendapro_user": {
    "id": "...",
    "email": "...",
    "nome": "...",
    "role": "admin" | "cliente",
    "cliente_id": "...", // Preenchido se role = 'cliente'
    "created_at": "..."
  }
}
```

---

## 🚀 Como Usar

1. Acesse `http://localhost:3000`
2. Será redirecionado para `/login`
3. Digite as credenciais (admin ou cliente)
4. Será redirecionado para o painel apropriado
5. Clique em "Sair" no topbar para fazer logout

---

## ⚙️ Implementação Futura

- [ ] Integração com Supabase Auth (substituir mock users)
- [ ] Reset de senha
- [ ] Autenticação 2FA
- [ ] Integração com WhatsApp
- [ ] Exportar relatórios em PDF/Excel
