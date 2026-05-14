import { getCurrentEvent } from '@/app/actions/events'
import { SetupForm } from './setup-form'

export const dynamic = 'force-dynamic'

export default async function EventSetupPage() {
  const event = await getCurrentEvent()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Event Setup</h1>
        <p className="text-muted-foreground text-lg">
          Configure the core details of your Egg Drop event.
        </p>
      </div>

      <SetupForm event={event} />
    </div>
  )
}
