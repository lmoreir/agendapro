'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/cliente/agenda': 'Minha Agenda',
  '/cliente/relatorio': 'Relatório de Evolução',
}

export function ClienteTopbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'AgendaPro'

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
    </header>
  )
}
