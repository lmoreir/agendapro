'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, BarChart3, LogOut, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/cliente/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/cliente/agenda',    label: 'Minha Agenda', icon: CalendarDays },
  { href: '/cliente/relatorio', label: 'Relatório',    icon: BarChart3 },
]

export function ClienteSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700/60">
        <span className="text-white text-xl font-bold tracking-tight">AgendaPro</span>
        {user && (
          <p className="text-gray-400 text-xs mt-2 truncate">{user.nome}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700/60">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sair
        </button>
      </div>

      <div className="px-6 py-4 border-t border-gray-700/60">
        <p className="text-gray-500 text-xs">AgendaPro v1.0</p>
      </div>
    </aside>
  )
}
