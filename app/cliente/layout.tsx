'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ClienteSidebar } from '@/components/cliente-sidebar'
import { ClienteTopbar } from '@/components/cliente-topbar'
import { Loader2 } from 'lucide-react'

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || role !== 'cliente') {
        router.replace('/login')
      }
    }
  }, [isAuthenticated, role, loading, router])

  if (loading || !isAuthenticated || role !== 'cliente') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-brand-50">
      <ClienteSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ClienteTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
