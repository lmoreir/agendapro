'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Cliente } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const mondayParam = monday.toISOString().split('T')[0]
  return { label: `${fmt(monday)} a ${fmt(sunday)}`, mondayParam }
}

export default function WhatsAppPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')
      setClientes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const getPublicLink = (clienteId: string) => {
    if (typeof window === 'undefined') return ''
    const { mondayParam } = getWeekRange()
    return `${window.location.origin}/p/${clienteId}?w=${mondayParam}`
  }

  const handleCopy = async (clienteId: string) => {
    const link = getPublicLink(clienteId)
    await navigator.clipboard.writeText(link)
    setCopiedId(clienteId)
    setTimeout(() => setCopiedId(null), 2500)
    addToast('Link copiado!', 'success')
  }

  const handleWhatsApp = (cliente: Cliente) => {
    const link = getPublicLink(cliente.id)
    const { label } = getWeekRange()
    const msg =
      `Olá *${cliente.nome}*! 📅\n\n` +
      `Segue a sua agenda da semana *${label}* pelo AgendaPro:\n\n` +
      `${link}\n\n` +
      `Acesse pelo celular para visualizar todos os seus compromissos. ✅`
    const numero = cliente.whatsapp.replace(/\D/g, '')
    const full = numero.startsWith('55') ? numero : `55${numero}`
    window.open(
      `https://wa.me/${full}?text=${encodeURIComponent(msg)}`,
      '_blank',
    )
  }

  const handlePreview = (clienteId: string) => {
    window.open(getPublicLink(clienteId), '_blank')
  }

  const { label: weekLabel } = getWeekRange()

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">WhatsApp</p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-900">Compartilhar agenda</h1>
            <p className="mt-3 text-gray-600 leading-7">
              Envie para cada cliente o link da agenda desta semana diretamente pelo WhatsApp.
              O link abre uma página responsiva, otimizada para celular.
            </p>
          </div>
          <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5 text-center min-w-[160px]">
            <p className="text-xs text-emerald-700 uppercase tracking-[0.2em]">Semana</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{weekLabel}</p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <div className="rounded-3xl bg-brand-50 border border-brand-100 p-5">
        <p className="text-sm font-semibold text-brand-800 mb-3">Como funciona</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-brand-700">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <p>Clique em <strong>Enviar WhatsApp</strong> no card do cliente</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <p>O WhatsApp Web abre com a mensagem já preenchida</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <p>O cliente abre o link e vê a agenda da semana no celular</p>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Clientes ativos</p>
        <p className="text-sm text-gray-500 mb-4">Selecione um cliente para compartilhar a agenda da semana.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum cliente ativo encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientes.map(cliente => (
              <div
                key={cliente.id}
                className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{cliente.nome}</p>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{cliente.ramo}</p>
                  </div>
                  <span className="bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0">
                    {cliente.sigla}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-2xl px-3 py-2 mb-4">
                  <p className="text-xs text-gray-400 mb-0.5">WhatsApp</p>
                  <p className="text-sm font-medium text-gray-700">{cliente.whatsapp}</p>
                </div>

                <div className="flex gap-2">
                  {/* Enviar WhatsApp */}
                  <button
                    onClick={() => handleWhatsApp(cliente)}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2.5 rounded-2xl transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar WhatsApp
                  </button>

                  {/* Copiar link */}
                  <button
                    onClick={() => handleCopy(cliente.id)}
                    className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-2.5 rounded-2xl transition"
                    title="Copiar link"
                  >
                    {copiedId === cliente.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Preview */}
                  <button
                    onClick={() => handlePreview(cliente.id)}
                    className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-2.5 rounded-2xl transition"
                    title="Visualizar agenda"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
