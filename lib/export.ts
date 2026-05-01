import { Agendamento, Cliente } from '@/types'

export function exportToCSV(data: any[], filename: string) {
  // Pegar as keys do primeiro objeto
  if (!data || data.length === 0) return

  const keys = Object.keys(data[0])
  
  // Criar header
  const header = keys.join(',')
  
  // Criar rows
  const rows = data.map(item =>
    keys.map(key => {
      const value = item[key]
      // Escapar valores com vírgula ou aspas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  
  // Juntar tudo
  const csv = [header, ...rows].join('\n')
  
  // Criar blob e download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportAgendamentosToCSV(
  agendamentos: (Agendamento & { clientes?: any })[],
  filename = 'agendamentos'
) {
  const data = agendamentos.map(a => ({
    'Data': a.data,
    'Horário': a.horario,
    'Paciente': a.nome_paciente,
    'WhatsApp': a.whatsapp_paciente,
    'Cliente': a.clientes?.nome || 'N/A',
    'Tipo': a.tipo_atendimento,
    'Status': a.status,
    'Observação': a.observacao || '',
  }))

  exportToCSV(data, filename)
}

export function exportClientesToCSV(
  clientes: Cliente[],
  filename = 'clientes'
) {
  const data = clientes.map(c => ({
    'Nome': c.nome,
    'Sigla': c.sigla,
    'Ramo': c.ramo,
    'WhatsApp': c.whatsapp,
    'Email': c.email,
    'Horário Início': c.horario_inicio,
    'Horário Fim': c.horario_fim,
    'Duração': c.duracao_atendimento,
    'Intervalo': c.intervalo_entre,
    'Status': c.status,
  }))

  exportToCSV(data, filename)
}

export function exportRelatorioToCSV(
  data: any[],
  filename = 'relatorio'
) {
  exportToCSV(data, filename)
}

// Exportar como HTML para PDF (usando print)
export function exportToPDF(htmlContent: string, filename: string) {
  const printWindow = window.open('', '', 'width=800,height=600')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      ${htmlContent}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.print()
}
