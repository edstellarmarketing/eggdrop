import Link from 'next/link'
import { LayoutDashboard, Users, ShoppingBag, Settings, Gavel, PlayCircle, Monitor, BarChart } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Event Setup', icon: Settings, href: '/admin/setup' },
  { label: 'Teams', icon: Users, href: '/admin/teams' },
  { label: 'Resources', icon: ShoppingBag, href: '/admin/resources' },
  { label: 'Judge & Rules', icon: Gavel, href: '/admin/rules' },
  { label: 'Projector Preview', icon: Monitor, href: '/projector' },
  { label: 'Analytics', icon: BarChart, href: '/admin/analytics' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col fixed inset-y-0">
        <div className="p-6 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🥚</span>
            <span>EggDrop Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.href === '/projector' ? '_blank' : undefined}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 transition-colors"
            >
              <item.icon className="w-4 h-4 text-zinc-500" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
            <PlayCircle className="w-4 h-4" />
            Go Live 🚀
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {children}
      </main>
    </div>
  )
}
