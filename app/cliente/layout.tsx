'use client'

import { useAuth } from '@/hooks/useAuth'
import { redirect } from 'next/navigation'
import { ClienteSidebar } from '@/components/cliente-sidebar'
import { ClienteTopbar } from '@/components/cliente-topbar'

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth()

  // Esperar carregamento
  if (loading) {
    return <div>Carregando...</div>
  }

  // Verificar autenticação e role
  if (!isAuthenticated || role !== 'cliente') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClienteSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ClienteTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
