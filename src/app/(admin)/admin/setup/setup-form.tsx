'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { saveEvent, type EventRecord } from '@/app/actions/events'
import { useRouter } from 'next/navigation'

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SetupForm({ event }: { event: EventRecord | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(event?.name ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [date, setDate] = useState(toDatetimeLocal(event?.date ?? null))
  const [height, setHeight] = useState(event?.drop_height_meters?.toString() ?? '3.0')
  const [timer, setTimer] = useState(event?.timer_duration_minutes?.toString() ?? '30')

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const result = await saveEvent({
      name,
      venue,
      date: date ? new Date(date).toISOString() : null,
      drop_height_meters: height ? parseFloat(height) : null,
      timer_duration_minutes: timer ? parseInt(timer, 10) : null,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(result.created ? 'Event created!' : 'Event settings saved!')
    router.refresh()
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Core Details</CardTitle>
          <CardDescription>
            {event ? 'Edit the current event configuration.' : 'No event yet — fill this in to create one (a default resource catalog will be seeded automatically).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                placeholder="e.g. Q4 Offsite Egg Drop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Drop Height (meters)</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timer">Build Timer (minutes)</Label>
              <Input
                id="timer"
                type="number"
                min="1"
                value={timer}
                onChange={(e) => setTimer(e.target.value)}
              />
            </div>
            {event && (
              <div className="space-y-2">
                <Label>Current Phase</Label>
                <div className="px-3 py-2 rounded-md bg-zinc-100 text-sm font-mono">
                  {event.current_phase}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : event ? 'Save Settings' : 'Create Event'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
