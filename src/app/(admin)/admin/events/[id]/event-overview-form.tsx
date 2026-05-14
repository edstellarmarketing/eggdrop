'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEvent, updateEvent, type EventRecord } from '@/app/actions/events'

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventOverviewForm({ event }: { event: EventRecord }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(event.name)
  const [venue, setVenue] = useState(event.venue ?? '')
  const [date, setDate] = useState(toDatetimeLocal(event.date))
  const [height, setHeight] = useState(event.drop_height_meters?.toString() ?? '3.0')
  const [timer, setTimer] = useState(event.timer_duration_minutes?.toString() ?? '30')

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const result = await updateEvent(event.id, {
      name,
      venue: venue || null,
      date: date ? new Date(date).toISOString() : null,
      drop_height_meters: height ? parseFloat(height) : null,
      timer_duration_minutes: timer ? parseInt(timer, 10) : null,
    })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Event saved.')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Delete event "${event.name}"? This removes teams, members, wallets, resources, and all transactions. This cannot be undone.`)) {
      return
    }
    setDeleting(true)
    const result = await deleteEvent(event.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Event deleted.')
    router.push('/admin')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave}>
        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">Event details</CardTitle>
            <CardDescription>Configure the core information for this event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="timer">Build timer (minutes)</Label>
                <Input
                  id="timer"
                  type="number"
                  min="1"
                  value={timer}
                  onChange={(e) => setTimer(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-100 px-6 py-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card className="border-red-200/70 bg-red-50/30">
        <CardHeader>
          <CardTitle className="font-display text-xl text-red-900">Danger zone</CardTitle>
          <CardDescription className="text-red-900/70">
            Deleting this event removes all of its teams, participants, wallets, resources, and history. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter className="px-6 py-4 flex justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete event
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
