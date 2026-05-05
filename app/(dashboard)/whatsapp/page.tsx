/*
 * Run in Supabase SQL editor:
 * create table if not exists public.whatsapp_config (
 *   id uuid default gen_random_uuid() primary key,
 *   ativo boolean not null default false,
 *   frequencia text not null default '1x',
 *   horario_1 text not null default '08:00',
 *   horario_2 text default null,
 *   zapi_instance_id text default null,
 *   zapi_token text default null,
 *   zapi_client_token text default null,
 *   ultimo_envio_1 date default null,
 *   ultimo_envio_2 date default null,
 *   updated_at timestamptz default now(),
 *   created_at timestamptz default now()
 * );
 * alter table public.whatsapp_config enable row level security;
 * create policy "whatsapp_config acesso total" on public.whatsapp_config for all using (true) with check (true);
 */

'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Loader2, AlertCircle, ExternalLink, Settings2, Send } from 'lucide-react'
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

  // Automation config state
  const [config, setConfig] = useState({
    id: null as string | null,
    ativo: false,
    frequencia: '1x' as '1x' | '2x',
    horario_1: '08:00',
    horario_2: '17:00',
    zapi_instance_id: '',
    zapi_token: '',
    zapi_client_token: '',
    ultimo_envio_1: null as string | null,
    ultimo_envio_2: null as string | null,
  })
  const [savingConfig, setSavingConfig] = useState(false)

  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    const load = async () => {
      const [clientesResult, configResult] = await Promise.all([
        supabase.from('clientes').select('*').eq('status', 'ativo').order('nome'),
        supabase.from('whatsapp_config').select('*').maybeSingle(),
      ])
      setClientes(clientesResult.data || [])
      const cfg = configResult.data
      if (cfg) setConfig({ ...cfg })
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

  const handleSaveConfig = async () => {
    console.log('SAVE CLICKED — config:', config)
    setSavingConfig(true)
    try {
      const payload = {
        ativo: config.ativo,
        frequencia: config.frequencia,
        horario_1: config.horario_1,
        horario_2: config.frequencia === '2x' ? config.horario_2 : null,
        zapi_instance_id: config.zapi_instance_id || null,
        zapi_token: config.zapi_token || null,
        zapi_client_token: config.zapi_client_token || null,
        updated_at: new Date().toISOString(),
      }
      if (config.id) {
        const { error } = await supabase.from('whatsapp_config').update(payload).eq('id', config.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        if (data) setConfig((prev) => ({ ...prev, id: data.id }))
      }
      console.log('SAVE SUCCESS')
      addToast('Configuração salva!', 'success')
    } catch (err) {
      console.error('SAVE ERROR:', err)
      addToast('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setSavingConfig(false)
    }
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

      {/* Automação de Envio */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
            <Settings2 className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Automação</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">Envio automático de agenda</p>
          </div>

          {/* Active toggle — right side */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {config.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <label className="relative block w-10 h-6 cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.ativo}
                onChange={(e) => setConfig((prev) => ({ ...prev, ativo: e.target.checked }))}
              />
              <div className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-brand-600 transition-colors" />
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4 pointer-events-none" />
            </label>
          </div>
        </div>

        {/* Info box about Z-API */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 mb-6 text-sm text-blue-800 leading-relaxed">
          Para o envio automático funcionar, você precisa de uma conta na{' '}
          <a
            href="https://z-api.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            Z-API (z-api.io)
          </a>{' '}
          — serviço brasileiro de integração com WhatsApp. Após criar sua instância e conectar
          seu WhatsApp, cole as credenciais abaixo.
        </div>

        {/* Frequency selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequência de envio
          </label>
          <div className="inline-flex rounded-2xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, frequencia: '1x' }))}
              className={`px-5 py-2.5 text-sm font-medium transition border-r border-gray-200 ${
                config.frequencia === '1x'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              1x por dia
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, frequencia: '2x' }))}
              className={`px-5 py-2.5 text-sm font-medium transition ${
                config.frequencia === '2x'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              2x por dia
            </button>
          </div>
        </div>

        {/* Time inputs */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Horário{config.frequencia === '2x' ? ' 1' : ''}
            </label>
            <input
              type="time"
              value={config.horario_1}
              onChange={(e) => setConfig((prev) => ({ ...prev, horario_1: e.target.value }))}
              className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {config.ultimo_envio_1 && (
              <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                <Send className="w-3 h-3" />
                Último envio: {config.ultimo_envio_1}
              </p>
            )}
          </div>

          {config.frequencia === '2x' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Horário 2
              </label>
              <input
                type="time"
                value={config.horario_2}
                onChange={(e) => setConfig((prev) => ({ ...prev, horario_2: e.target.value }))}
                className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              {config.ultimo_envio_2 && (
                <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  Último envio: {config.ultimo_envio_2}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Z-API credentials — show only when active */}
        {config.ativo && (
          <div className="border border-gray-100 rounded-2xl p-4 mb-5 space-y-4 bg-gray-50">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-medium">
              Credenciais Z-API
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instance ID
              </label>
              <input
                type="text"
                value={config.zapi_instance_id}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, zapi_instance_id: e.target.value }))
                }
                placeholder="Ex: 3DF81234ABCD..."
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Token
              </label>
              <input
                type="password"
                value={config.zapi_token}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, zapi_token: e.target.value }))
                }
                placeholder="••••••••••••••••"
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Client Token
              </label>
              <input
                type="password"
                value={config.zapi_client_token}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, zapi_client_token: e.target.value }))
                }
                placeholder="••••••••••••••••"
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-2xl px-6 py-2.5 text-sm font-medium transition"
          >
            {savingConfig ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {savingConfig ? 'Salvando...' : 'Salvar configuração'}
          </button>
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
