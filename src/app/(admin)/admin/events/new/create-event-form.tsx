'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createEvent } from '@/app/actions/events'

export function CreateEventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [date, setDate] = useState('')
  const [height, setHeight] = useState('3.0')
  const [timer, setTimer] = useState('30')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const result = await createEvent({
      name,
      venue: venue || null,
      date: date ? new Date(date).toISOString() : null,
      drop_height_meters: height ? parseFloat(height) : null,
      timer_duration_minutes: timer ? parseInt(timer, 10) : null,
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Event created.')
    router.push(`/admin/events/${result.eventId}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-zinc-200/80">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event name</Label>
            <Input
              id="name"
              placeholder="e.g. Q4 Offsite Egg Drop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              placeholder="e.g. Bengaluru HQ Atrium"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date & time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Drop height (m)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 max-w-[16rem]">
            <Label htmlFor="timer">Build timer (minutes)</Label>
            <Input
              id="timer"
              type="number"
              min="1"
              value={timer}
              onChange={(e) => setTimer(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-100 px-6 md:px-8 py-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create event
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
