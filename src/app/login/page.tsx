'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck, Gavel, ArrowRight, Loader2, Mail, KeyRound } from 'lucide-react'

type Role = 'admin' | 'collaborator'

const ROLE_COPY: Record<Role, { title: string; description: string; icon: typeof ShieldCheck }> = {
  admin: {
    title: 'Admin sign in',
    description: 'Game masters — configure events, teams, resources, and launch the show.',
    icon: ShieldCheck,
  },
  collaborator: {
    title: 'Collaborator sign in',
    description: 'Judges and co-facilitators — score drops and run the live console.',
    icon: Gavel,
  },
}

export default function LoginPage() {
  const [role, setRole] = useState<Role>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(role === 'admin' ? '/admin' : '/judge')
  }

  const copy = ROLE_COPY[role]
  const Icon = copy.icon

  return (
    <div className="relative min-h-screen flex flex-col bg-auth-surface overflow-hidden">
      <div className="absolute inset-0 bg-auth-grid pointer-events-none" />

      <header className="relative z-10 w-full px-6 py-5 md:px-10">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/edstellar-logo.png"
            alt="Edstellar"
            width={132}
            height={28}
            priority
            className="h-7 w-auto"
            style={{ width: 'auto', height: '1.75rem' }}
          />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 items-center">
          <section className="space-y-6 max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-zinc-200 text-xs font-medium text-zinc-700 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Egg Drop Console · powered by Edstellar
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900">
              Run the Egg Drop challenge end-to-end.
            </h1>
            <p className="text-lg text-zinc-600 leading-relaxed">
              A real-time, projector-friendly console that takes corporate offsites
              from setup, to live marketplace, to scoring, to leaderboard — without a
              single spreadsheet.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Live marketplace
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Judge console
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Projector view
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Auto-leaderboard
              </div>
            </div>
          </section>

          <section className="w-full">
            <Card className="border-zinc-200/70 shadow-xl shadow-zinc-900/[0.04] bg-white/85 backdrop-blur">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div
                  role="tablist"
                  aria-label="Login role"
                  className="grid grid-cols-2 p-1 rounded-lg bg-zinc-100 text-sm font-medium"
                >
                  {(Object.keys(ROLE_COPY) as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={role === r}
                      onClick={() => {
                        setRole(r)
                        setError(null)
                        setMessage(null)
                      }}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all ${
                        role === r
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {r === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Gavel className="w-4 h-4" />
                      )}
                      {r === 'admin' ? 'Admin' : 'Collaborator'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2 text-zinc-900">
                    <Icon className="w-5 h-5 text-zinc-700" />
                    {copy.title}
                  </h2>
                  <p className="text-sm text-zinc-500">{copy.description}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}
                  {message && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                      {message}
                    </p>
                  )}

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Sign in
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center text-sm text-zinc-600">
              Joining a team?{' '}
              <Link
                href="/team/join"
                className="font-medium text-zinc-900 hover:underline inline-flex items-center gap-1"
              >
                Enter your join code <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-6 md:px-10 py-6 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Edstellar. All rights reserved.</span>
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Console online
        </span>
      </footer>
    </div>
  )
}
