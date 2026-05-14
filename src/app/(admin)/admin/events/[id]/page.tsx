import { notFound } from 'next/navigation'
import { getEvent } from '@/app/actions/events'
import { EventOverviewForm } from './event-overview-form'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventOverviewPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return <EventOverviewForm event={event} />
}
