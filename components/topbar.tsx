'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

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

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {action && (
          <button
            onClick={() => router.push(action.href)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {action.label}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </header>
  )
}
