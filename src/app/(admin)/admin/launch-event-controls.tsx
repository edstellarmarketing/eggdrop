'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import { transitionEventPhase } from '@/app/actions/game-engine'
import { GAME_PHASES } from '@/lib/constants'

interface Props {
  eventId: string
  currentPhase: string
  checklistComplete: boolean
}

export function LaunchEventControls({ eventId, currentPhase, checklistComplete }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  const isLaunched = currentPhase !== GAME_PHASES.SETUP

  async function handleLaunch() {
    if (!checklistComplete) {
      toast.error('Complete the checklist first (teams, resources, judge).')
      return
    }
    if (!confirm('Launch the event? Captains will receive their budget offers next.')) {
      return
    }
    setSubmitting(true)
    const result = await transitionEventPhase(eventId, GAME_PHASES.BUDGET_OFFER)
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Event launched. Budget offers are live.')
    startTransition(() => router.refresh())
  }

  if (isLaunched) {
    return (
      <div className="mt-4 text-sm text-zinc-400">
        Event is already running. Manage live phases from the controls coming in the next step.
      </div>
    )
  }

  return (
    <Button
      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white border-none disabled:opacity-50"
      onClick={handleLaunch}
      disabled={submitting}
    >
      {submitting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <PlayCircle className="w-4 h-4 mr-2" />
      )}
      Launch Event
    </Button>
  )
}
