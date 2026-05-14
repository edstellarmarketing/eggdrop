import { getTeams } from '@/app/actions/teams'
import { TeamsManager } from './teams-manager'

export const dynamic = 'force-dynamic'

export default async function TeamsManagerPage() {
  const { event, teams } = await getTeams()

  return (
    <div className="p-8">
      <TeamsManager event={event} teams={teams} />
    </div>
  )
}
