'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { GlobalSearch } from '@/components/global-search'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/agenda':     'Agenda',
  '/clientes':   'Clientes',
  '/whatsapp':   'WhatsApp',
  '/relatorios': 'Relatórios',
}

const pageActions: Record<string, { label: string; href: string }> = {
  '/dashboard': { label: 'Novo agendamento', href: '/agenda' },
  '/agenda':    { label: 'Novo agendamento', href: '/agenda' },
  '/clientes':  { label: 'Novo cliente',     href: '/clientes' },
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const title = pageTitles[pathname] ?? 'AgendaPro'
  const action = pageActions[pathname]

  const handleLogout = () => {
    logout()
  }

  const handleActionClick = () => {
    if (!action) return
    if (pathname === '/agenda') {
      window.dispatchEvent(new CustomEvent('topbar:novoAgendamento'))
    } else {
      router.push(action.href)
    }
  }

  return (
    <header className="bg-brand-50 border-b border-brand-100 px-6 h-16 flex items-center justify-between flex-shrink-0 gap-4">
      <h1 className="text-lg font-semibold text-brand-900">{title}</h1>

      {/* Search (visible em todas páginas) */}
      <div className="flex-1 max-w-xs">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        {action && (
          <button
            onClick={handleActionClick}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {action.label}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-brand-800 hover:text-brand-900 text-sm font-medium px-3 py-2 rounded-lg hover:bg-brand-100 transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </header>
  )
}
