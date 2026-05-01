'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User, UserRole } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  role: UserRole | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
    role: null,
  })

  // Carregar user do localStorage na montagem
  useEffect(() => {
    const storedUser = localStorage.getItem('agendapro_user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User
        setState({
          user,
          loading: false,
          isAuthenticated: true,
          role: user.role,
        })
      } catch (error) {
        console.error('Erro ao carregar user:', error)
        localStorage.removeItem('agendapro_user')
        setState({ user: null, loading: false, isAuthenticated: false, role: null })
      }
    } else {
      setState({ user: null, loading: false, isAuthenticated: false, role: null })
    }
  }, [])

  const login = useCallback(
    (user: User) => {
      localStorage.setItem('agendapro_user', JSON.stringify(user))
      setState({
        user,
        loading: false,
        isAuthenticated: true,
        role: user.role,
      })

      // Redirecionar baseado no role
      if (user.role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/cliente/agenda')
      }
    },
    [router]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('agendapro_user')
    setState({ user: null, loading: false, isAuthenticated: false, role: null })
    router.push('/login')
  }, [router])

  return {
    user: state.user,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated,
    role: state.role,
    login,
    logout,
  }
}
