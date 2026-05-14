import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getEvent } from '@/app/actions/events'
import { EventTabs } from './event-tabs'

export const dynamic = 'force-dynamic'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

function formatPhase(phase: string | null | undefined) {
  if (!phase) return 'setup'
  return phase.replace(/_/g, ' ')
}

export default async function EventLayout({ children, params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-12 w-full">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All events
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-1">Event</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            {event.name}
          </h1>
          {event.venue && (
            <p className="text-zinc-500 mt-1">{event.venue}</p>
          )}
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-zinc-100 text-zinc-700">
          Phase: {formatPhase(event.current_phase)}
        </span>
      </header>

      <EventTabs eventId={event.id} />

      <div className="mt-8">{children}</div>
    </div>
  )
}
