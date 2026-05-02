'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageCircle,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/agenda',     label: 'Agenda',     icon: CalendarDays    },
  { href: '/clientes',   label: 'Clientes',   icon: Users           },
  { href: '/whatsapp',   label: 'WhatsApp',   icon: MessageCircle   },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3       },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-brand-900 text-brand-100 flex flex-col">
      <div className="px-6 py-6 border-b border-brand-700/60">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-tight">AgendaPro</span>
        </div>
        <p className="mt-2 text-xs text-brand-200/80">Painel administrativo</p>
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

      <div className="px-6 py-4 border-t border-brand-700/60">
        <p className="text-gray-300 text-xs">Suporte e insights</p>
        <p className="mt-2 text-sm text-brand-100">Acesse relatórios e mantenha o fluxo organizado.</p>
      </div>
    </aside>
  )
}
