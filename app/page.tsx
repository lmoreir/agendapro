'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, role, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (role === 'admin') {
          router.push('/dashboard')
        } else if (role === 'cliente') {
          router.push('/cliente/agenda')
        }
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, role, loading, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-50" />
    </div>
  )
}
