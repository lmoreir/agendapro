'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Cliente, Agendamento } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  clientes: Cliente[]
  agendamentos: Agendamento[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults(null)
        return
      }

      setLoading(true)
      try {
        const searchTerm = `%${query}%`

        const [clientesRes, agendamentosRes] = await Promise.all([
          supabase
            .from('clientes')
            .select('*')
            .or(`nome.ilike.${searchTerm},sigla.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from('agendamentos')
            .select('*, clientes(nome, sigla)')
            .or(`nome_paciente.ilike.${searchTerm},whatsapp_paciente.ilike.${searchTerm}`)
            .limit(5),
        ])

        setResults({
          clientes: clientesRes.data || [],
          agendamentos: agendamentosRes.data as Agendamento[] || [],
        })
      } catch (error) {
        console.error('Erro ao buscar:', error)
        setResults({ clientes: [], agendamentos: [] })
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [query, supabase])

  const handleSelectCliente = (id: string) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/clientes#${id}`)
  }

  const handleSelectAgendamento = (id: string) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/agenda#${id}`)
  }

  const hasResults = results && (results.clientes.length > 0 || results.agendamentos.length > 0)

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar clientes, agendamentos..."
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults(null)
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {loading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando...
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhum resultado encontrado
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Clientes */}
              {results!.clientes.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Clientes</p>
                  </div>
                  {results!.clientes.map(cliente => (
                    <button
                      key={cliente.id}
                      onClick={() => handleSelectCliente(cliente.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition"
                    >
                      <div className="font-medium text-gray-900">{cliente.nome}</div>
                      <div className="text-xs text-gray-600">
                        {cliente.sigla} • {cliente.ramo}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Agendamentos */}
              {results!.agendamentos.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Agendamentos</p>
                  </div>
                  {results!.agendamentos.map(agendamento => (
                    <button
                      key={agendamento.id}
                      onClick={() => handleSelectAgendamento(agendamento.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition"
                    >
                      <div className="font-medium text-gray-900">
                        {agendamento.nome_paciente}
                      </div>
                      <div className="text-xs text-gray-600">
                        {(agendamento as any).clientes?.nome} • {agendamento.data}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
