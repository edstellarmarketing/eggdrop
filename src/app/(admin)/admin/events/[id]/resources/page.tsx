import { notFound } from 'next/navigation'
import { getEvent } from '@/app/actions/events'
import { listResources } from '@/app/actions/resources'
import { ResourcesManager } from './resources-manager'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventResourcesPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const resources = await listResources(id)

  return <ResourcesManager eventId={id} resources={resources} />
}
