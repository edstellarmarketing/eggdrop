import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { getTeamConsoleData, readTeamSession } from './actions'
import { TeamConsole } from './team-console'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const session = await readTeamSession()
  if (!session) {
    redirect('/team/join')
  }

  const result = await getTeamConsoleData()

  if ('error' in result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-destructive font-medium">{result.error}</p>
            <p className="text-sm text-muted-foreground">
              Your team session may be stale. Go back to{' '}
              <a className="underline" href="/team/join">
                /team/join
              </a>{' '}
              and enter your code again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { team, event, wallet, resources } = result.data

  return (
    <TeamConsole team={team} event={event} wallet={wallet} resources={resources} />
  )
}
