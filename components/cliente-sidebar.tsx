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
  { href: '/cliente/agenda',    label: 'Minha Agenda', icon: CalendarDays    },
  { href: '/cliente/relatorio', label: 'Relatório',    icon: BarChart3       },
]

export function ClienteSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-brand-900 text-brand-100 flex flex-col">
      <div className="px-6 py-6 border-b border-brand-700/60">
        <span className="text-white text-xl font-semibold tracking-tight">AgendaPro</span>
        <p className="mt-2 text-xs text-brand-200/80">
          {user?.nome ?? 'Portal do cliente'}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-600 text-white shadow-inner'
                  : 'text-brand-100 hover:text-white hover:bg-brand-700/80'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-brand-700/60">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-brand-100 hover:text-white hover:bg-brand-700/80 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
