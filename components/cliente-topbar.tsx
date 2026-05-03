'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const pageTitles: Record<string, string> = {
  '/cliente/dashboard': 'Dashboard',
  '/cliente/agenda':    'Minha Agenda',
  '/cliente/relatorio': 'Relatório de Evolução',
}

export function ClienteTopbar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const title = pageTitles[pathname] ?? 'AgendaPro'

  return (
    <header className="bg-brand-50 border-b border-brand-100 px-6 h-16 flex items-center justify-between flex-shrink-0 gap-4">
      <h1 className="text-lg font-semibold text-brand-900">{title}</h1>

      <button
        onClick={logout}
        className="flex items-center gap-2 text-brand-800 hover:text-brand-900 text-sm font-medium px-3 py-2 rounded-lg hover:bg-brand-100 transition-colors"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>
    </header>
  )
}
