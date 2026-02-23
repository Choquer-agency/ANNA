'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calculator,
  TrendingDown,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/costs', label: 'Costs & Profit', icon: Calculator },
  { href: '/churn', label: 'Churn', icon: TrendingDown },
  { href: '/health', label: 'Health Scores', icon: HeartPulse },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r border-border bg-surface h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-lg font-bold text-ink">Anna Admin</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
