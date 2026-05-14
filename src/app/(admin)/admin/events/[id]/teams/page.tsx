import { notFound } from 'next/navigation'
import { getEvent } from '@/app/actions/events'
import { listTeams } from '@/app/actions/teams'
import { TeamsManager } from './teams-manager'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventTeamsPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const teams = await listTeams(id)

  return <TeamsManager eventId={id} eventName={event.name} teams={teams} />
}
