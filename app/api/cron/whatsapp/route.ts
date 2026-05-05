import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Brazil time helper using Intl (handles DST correctly)
function getBrazilDateInfo(now: Date) {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    h: get('hour'),
    m: get('minute'),
    dateStr: `${get('year')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}`,
  }
}

// Check if a given HH:MM time string is within a 30-minute window of now
function isWithinWindow(timeStr: string, h: number, m: number): boolean {
  if (!timeStr) return false
  const [th, tm] = timeStr.split(':').map(Number)
  const schedMins = th * 60 + tm
  const nowMins = h * 60 + m
  return nowMins >= schedMins && nowMins < schedMins + 30
}

// Get Monday of the current Brazil week
function getMondayDateStr(now: Date): string {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0')
  const y = get('year')
  const mo = get('month')
  const d = get('day')

  // Reconstruct a local date object to compute day-of-week
  const localDate = new Date(y, mo - 1, d)
  const day = localDate.getDay()
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() - ((day + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Load whatsapp_config (single row)
  const { data: cfg } = await supabase
    .from('whatsapp_config')
    .select('*')
    .maybeSingle()

  if (!cfg || !cfg.ativo) {
    return NextResponse.json({ status: 'not_active' })
  }

  const { zapi_instance_id, zapi_token, zapi_client_token } = cfg
  if (!zapi_instance_id || !zapi_token || !zapi_client_token) {
    return NextResponse.json({ status: 'missing_credentials' })
  }

  // Get current Brazil time
  const now = new Date()
  const { h, m, dateStr: today } = getBrazilDateInfo(now)

  // Determine which sends should fire
  const shouldSend1 =
    isWithinWindow(cfg.horario_1, h, m) && cfg.ultimo_envio_1 !== today

  const shouldSend2 =
    cfg.frequencia === '2x' &&
    isWithinWindow(cfg.horario_2, h, m) &&
    cfg.ultimo_envio_2 !== today

  if (!shouldSend1 && !shouldSend2) {
    return NextResponse.json({ status: 'not_time_yet' })
  }

  // Fetch active clients
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .eq('status', 'ativo')
    .order('nome')

  if (!clientes || clientes.length === 0) {
    return NextResponse.json({ status: 'no_clients' })
  }

  // Determine base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (() => {
      const host = request.headers.get('host') ?? 'localhost:3000'
      const proto = host.startsWith('localhost') ? 'http' : 'https'
      return `${proto}://${host}`
    })()

  const mondayDateStr = getMondayDateStr(now)

  // Build Z-API endpoint base
  const zapiBase = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_token}/send-text`

  let sent = 0
  let errors = 0

  // Send messages to all clients
  for (const cliente of clientes) {
    if (!cliente.whatsapp) continue

    const link = `${baseUrl}/p/${cliente.id}?w=${mondayDateStr}`

    // Format week label from mondayDateStr
    const [my, mm, md] = mondayDateStr.split('-').map(Number)
    const mondayDate = new Date(my, mm - 1, md)
    const sundayDate = new Date(mondayDate)
    sundayDate.setDate(mondayDate.getDate() + 6)
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const weekLabel = `${fmtDate(mondayDate)} a ${fmtDate(sundayDate)}`

    const message =
      `Olá *${cliente.nome}*! 📅\n\n` +
      `Segue a sua agenda da semana *${weekLabel}* pelo AgendaPro:\n\n` +
      `${link}\n\n` +
      `Acesse pelo celular para visualizar todos os seus compromissos. ✅`

    const numero = cliente.whatsapp.replace(/\D/g, '')
    const phone = numero.startsWith('55') ? numero : `55${numero}`

    try {
      const res = await fetch(zapiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-token': zapi_client_token,
        },
        body: JSON.stringify({ phone, message }),
      })

      if (res.ok) {
        sent++
      } else {
        errors++
        console.error(`Z-API error for ${cliente.nome}:`, res.status, await res.text())
      }
    } catch (err) {
      errors++
      console.error(`Z-API fetch error for ${cliente.nome}:`, err)
    }
  }

  // Update ultimo_envio fields
  const updatePayload: Record<string, string> = {}
  if (shouldSend1) updatePayload.ultimo_envio_1 = today
  if (shouldSend2) updatePayload.ultimo_envio_2 = today

  if (Object.keys(updatePayload).length > 0 && cfg.id) {
    await supabase
      .from('whatsapp_config')
      .update(updatePayload)
      .eq('id', cfg.id)
  }

  return NextResponse.json({ status: 'sent', sent, errors })
}
