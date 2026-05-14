import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { signOutAction } from './actions'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/60">
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/admin" className="inline-flex items-center gap-3">
            <Image
              src="/edstellar-logo.png"
              alt="Edstellar"
              width={132}
              height={28}
              priority
              className="h-7 w-auto"
              style={{ width: 'auto', height: '1.75rem' }}
            />
            <span className="text-zinc-300 select-none">|</span>
            <span className="text-sm font-medium text-zinc-600 tracking-wide">Console</span>
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors px-2.5 py-1.5 rounded-md hover:bg-zinc-100"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
