import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getEvent } from '@/app/actions/events'
import { getTeam } from '@/app/actions/teams'
import { listParticipants } from '@/app/actions/participants'
import { ParticipantsManager } from './participants-manager'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; teamId: string }>
}

export default async function TeamParticipantsPage({ params }: Props) {
  const { id, teamId } = await params
  const [event, team] = await Promise.all([getEvent(id), getTeam(teamId)])
  if (!event || !team || team.event_id !== id) notFound()

  const participants = await listParticipants(teamId)

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/events/${id}/teams`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        All teams
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color || '#999' }}
          />
          <div>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">{team.name}</h2>
            <p className="text-sm text-zinc-500">
              Join code <span className="font-mono text-zinc-700">{team.join_code ?? '—'}</span>{' '}
              · Budget{' '}
              <span className="font-mono text-zinc-700">
                {team.remaining_balance.toFixed(0)} / {team.total_budget.toFixed(0)}
              </span>{' '}
              CR
            </p>
          </div>
        </div>
      </div>

      <ParticipantsManager teamId={teamId} participants={participants} />
    </div>
  )
}
