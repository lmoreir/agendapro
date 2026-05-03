'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) router.replace('/login')
      else if (role === 'cliente') router.replace('/cliente/agenda')
    }
  }, [isAuthenticated, role, loading, router])

  if (loading || !isAuthenticated || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
      </div>
    )
  }

  return <>{children}</>
}
