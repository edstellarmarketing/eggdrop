import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, Plus, ShoppingBag, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listEvents } from '@/app/actions/events'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatPhase(phase: string | null | undefined) {
  if (!phase) return 'setup'
  return phase.replace(/_/g, ' ')
}

export default async function AdminEventsPage() {
  const events = await listEvents()

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14 w-full">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Console</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Events
          </h1>
          <p className="text-zinc-500 mt-1">Create an event, then configure its teams, participants, and resources.</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="h-11 gap-2">
            <Plus className="w-4 h-4" />
            Create event
          </Button>
        </Link>
      </header>

      {events.length === 0 ? (
        <Card className="border-dashed border-2 border-zinc-200 bg-white/60">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
              <CalendarDays className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-xl font-semibold text-zinc-900">No events yet</p>
              <p className="text-zinc-500 text-sm">
                You haven&apos;t created an event. Start by creating one — a default resource catalog will be added for you.
              </p>
            </div>
            <Link href="/admin/events/new" className="inline-flex">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create your first event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((event) => {
            const dateStr = formatDate(event.date)
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="group block"
              >
                <Card className="transition-all border-zinc-200/80 group-hover:border-zinc-300 group-hover:shadow-md hover:-translate-y-px">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-display text-xl font-semibold text-zinc-900 truncate">
                          {event.name}
                        </h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                          {event.venue && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.venue}
                            </span>
                          )}
                          {dateStr && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {dateStr}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-zinc-100 text-zinc-600">
                        {formatPhase(event.current_phase)}
                      </span>
                    </div>

                    <div className="flex items-center gap-5 pt-2 text-sm">
                      <div className="inline-flex items-center gap-1.5 text-zinc-600">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span className="font-medium text-zinc-900">{event.team_count}</span>
                        <span className="text-zinc-500">teams</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-zinc-600">
                        <ShoppingBag className="w-4 h-4 text-zinc-400" />
                        <span className="font-medium text-zinc-900">{event.resource_count}</span>
                        <span className="text-zinc-500">resources</span>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
