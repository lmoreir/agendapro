'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, KeyRound } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'

interface ClienteAcessoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  cliente: Cliente
}

export function ClienteAcessoModal({ isOpen, onClose, onSuccess, cliente }: ClienteAcessoModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingExistente, setLoadingExistente] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', senha: '', confirmar: '', status: 'ativo' as 'ativo' | 'inativo' })
  const [error, setError] = useState('')

  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setLoadingExistente(true)
    supabase
      .from('usuarios')
      .select('id, email, status')
      .eq('cliente_id', cliente.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUsuarioId(data.id)
          setForm({ email: data.email, senha: '', confirmar: '', status: data.status })
        } else {
          setUsuarioId(null)
          setForm({ email: cliente.email || '', senha: '', confirmar: '', status: 'ativo' })
        }
        setLoadingExistente(false)
      })
  }, [isOpen, cliente])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.email.trim()) { setError('Informe o email'); return }
    if (!usuarioId && !form.senha) { setError('Informe a senha'); return }
    if (form.senha && form.senha !== form.confirmar) { setError('As senhas não coincidem'); return }
    if (form.senha && form.senha.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    try {
      if (usuarioId) {
        const update: Record<string, string> = { email: form.email.trim().toLowerCase(), status: form.status }
        if (form.senha) update.senha = form.senha
        const { error } = await supabase.from('usuarios').update(update).eq('id', usuarioId)
        if (error) throw error
        addToast('Acesso atualizado com sucesso!', 'success')
      } else {
        const { error } = await supabase.from('usuarios').insert([{
          email: form.email.trim().toLowerCase(),
          senha: form.senha,
          role: 'cliente',
          cliente_id: cliente.id,
          nome: cliente.nome,
          status: form.status,
        }])
        if (error) throw error
        addToast('Acesso criado com sucesso!', 'success')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message?.includes('duplicate') ? 'Este email já está em uso' : 'Erro ao salvar acesso')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Acesso do Cliente</h2>
              <p className="text-xs text-gray-500 mt-0.5">{cliente.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {loadingExistente ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-brand-700" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {usuarioId && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Acesso já configurado — deixe a senha em branco para não alterar.
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de acesso *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {usuarioId ? 'Nova senha (opcional)' : 'Senha *'}
              </label>
              <input type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="••••••••" />
            </div>
            {form.senha && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha *</label>
                <input type="password" value={form.confirmar} onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="••••••••" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'ativo' | 'inativo' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo (bloqueia acesso)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {usuarioId ? 'Atualizar acesso' : 'Criar acesso'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
