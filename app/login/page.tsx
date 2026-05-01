'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types'

// Mock de usuários (em produção, viria do Supabase com autenticação real)
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@agendapro.com',
    senha: 'admin123',
    role: 'admin',
    nome: 'Administrador',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'clinica@agendapro.com',
    senha: 'clinica123',
    role: 'cliente',
    cliente_id: 'abc-123', // ID do cliente do Supabase
    nome: 'Clínica Saúde',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'consultorio@agendapro.com',
    senha: 'consultorio123',
    role: 'cliente',
    cliente_id: 'def-456',
    nome: 'Consultório Dr. Silva',
    created_at: new Date().toISOString(),
  },
]

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se já autenticado, redirecionar
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Simular delay de requisição
      await new Promise(resolve => setTimeout(resolve, 500))

      // Buscar usuário (em produção, seria uma chamada ao Supabase)
      const user = MOCK_USERS.find(u => u.email === email && u.senha === senha)

      if (!user) {
        setError('Email ou senha incorretos')
        setLoading(false)
        return
      }

      login(user)
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AgendaPro</h1>
            <p className="text-gray-600">Sistema de Agendamento Profissional</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium mb-3">Contas de Teste:</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>
                <p className="font-medium text-gray-700">Admin:</p>
                <p>Email: admin@agendapro.com</p>
                <p>Senha: admin123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Cliente:</p>
                <p>Email: clinica@agendapro.com</p>
                <p>Senha: clinica123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
