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
    <aside className="w-60 min-h-screen bg-brand-900 flex flex-col">
      <div className="px-6 py-5 border-b border-brand-700/60">
        <span className="text-brand-50 text-xl font-bold tracking-tight">AgendaPro</span>
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
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-100 hover:text-white hover:bg-brand-700'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-700/60">
        <p className="text-gray-500 text-xs">AgendaPro v1.0</p>
      </div>
    </aside>
  )
}
