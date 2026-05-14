'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingBag } from 'lucide-react'

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname()
  const base = `/admin/events/${eventId}`

  const tabs = [
    { label: 'Overview', href: base, icon: LayoutDashboard, match: (p: string) => p === base },
    {
      label: 'Teams',
      href: `${base}/teams`,
      icon: Users,
      match: (p: string) => p.startsWith(`${base}/teams`),
    },
    {
      label: 'Resources',
      href: `${base}/resources`,
      icon: ShoppingBag,
      match: (p: string) => p.startsWith(`${base}/resources`),
    },
  ]

  return (
    <nav className="border-b border-zinc-200 -mb-px">
      <ul className="flex items-center gap-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
