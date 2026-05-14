import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LayoutDashboard, Users, ShoppingBag, Settings, Gavel } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentEvent } from '@/app/actions/events'
import { LaunchEventControls } from './launch-event-controls'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  teamCount: number
  resourceCount: number
  judgeCount: number
  buildMinutes: number
}

async function loadStats(eventId: string): Promise<DashboardStats> {
  const supabase = createAdminClient()
  const [teams, resources, judges, event] = await Promise.all([
    supabase
      .schema('eggdrop')
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .schema('eggdrop')
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .schema('eggdrop')
      .from('collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('role', 'judge'),
    supabase
      .schema('eggdrop')
      .from('events')
      .select('timer_duration_minutes')
      .eq('id', eventId)
      .maybeSingle(),
  ])

  return {
    teamCount: teams.count ?? 0,
    resourceCount: resources.count ?? 0,
    judgeCount: judges.count ?? 0,
    buildMinutes: Number(event.data?.timer_duration_minutes ?? 30),
  }
}

function formatPhase(phase: string | null | undefined) {
  if (!phase) return 'unknown'
  return phase.replace(/_/g, ' ')
}

export default async function AdminDashboard() {
  const event = await getCurrentEvent()

  if (!event) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg">No event yet — create one to get started.</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <LayoutDashboard className="w-10 h-10 text-zinc-300 mx-auto" />
            <p>
              You haven&apos;t created an event yet. Head to{' '}
              <Link href="/admin/setup" className="underline font-medium">
                Event Setup
              </Link>{' '}
              to configure one.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = await loadStats(event.id)
  const phaseLabel = formatPhase(event.current_phase)

  const cards = [
    {
      label: 'Teams Created',
      value: String(stats.teamCount),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Resources',
      value: String(stats.resourceCount),
      icon: ShoppingBag,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Build Time',
      value: `${stats.buildMinutes}m`,
      icon: Settings,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Judge Assigned',
      value: stats.judgeCount > 0 ? `${stats.judgeCount}` : 'No',
      icon: Gavel,
      color: stats.judgeCount > 0 ? 'text-amber-600' : 'text-zinc-400',
      bg: stats.judgeCount > 0 ? 'bg-amber-100' : 'bg-zinc-100',
    },
  ]

  const checklist = [
    { label: 'Event configured', done: true },
    { label: 'Create at least 2 teams', done: stats.teamCount >= 2 },
    { label: 'Set up resource catalog', done: stats.resourceCount > 0 },
    { label: 'Assign a judge', done: stats.judgeCount > 0 },
  ]

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            <span className="font-medium">{event.name}</span>
            {event.venue ? ` · ${event.venue}` : ''}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-sm font-medium uppercase tracking-wider">
          Phase: {phaseLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/setup"
              className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center"
            >
              <Settings className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Update Setup</span>
            </Link>
            <Link
              href="/admin/teams"
              className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center"
            >
              <Users className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Manage Teams</span>
            </Link>
            <Link
              href="/admin/resources"
              className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center"
            >
              <ShoppingBag className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Edit Catalog</span>
            </Link>
            <Link
              href="/admin/rules"
              className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center"
            >
              <Gavel className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Judge & Rules</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle>Go Live Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.map((item, idx) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    item.done
                      ? 'bg-green-500 border-green-500'
                      : 'border border-zinc-700'
                  }`}
                >
                  {item.done ? '✓' : idx + 1}
                </div>
                <span className="text-sm text-zinc-300">{item.label}</span>
              </div>
            ))}
            <LaunchEventControls
              eventId={event.id}
              currentPhase={event.current_phase}
              checklistComplete={checklist.every((c) => c.done)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
