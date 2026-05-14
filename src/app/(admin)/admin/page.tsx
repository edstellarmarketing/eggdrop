'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, ShoppingBag, Settings, Gavel, PlayCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { transitionEventPhase } from '@/app/actions/game-engine'
import { GAME_PHASES } from '@/lib/constants'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [launching, setLaunching] = useState(false)
  
  // For prototype, we'll assume an event ID.
  const eventId = 'active-event-id' 

  async function handleLaunch() {
    setLaunching(true)
    // In a real app, you'd fetch the actual event ID from a selector or context
    const result = await transitionEventPhase(eventId, GAME_PHASES.BUDGET_OFFER)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Event launched! Budget offers sent to teams.')
    }
    setLaunching(false)
  }

  const stats = [
    { label: 'Teams Created', value: '2', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Resources', value: '12', icon: ShoppingBag, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Build Time', value: '30m', icon: Settings, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Judge Assigned', value: 'No', icon: Gavel, color: 'text-amber-600', bg: 'bg-amber-100' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome back. Here is your event overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/admin/setup" className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center">
              <Settings className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Update Setup</span>
            </Link>
            <Link href="/admin/teams" className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center">
              <Users className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Manage Teams</span>
            </Link>
            <Link href="/admin/resources" className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center">
              <ShoppingBag className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Edit Catalog</span>
            </Link>
            <Link href="/admin/rules" className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2 text-center">
              <Gavel className="w-6 h-6 text-zinc-500" />
              <span className="text-sm font-medium">Judge & Rules</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle>Go Live Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] bg-green-500 border-green-500">✓</div>
              <span className="text-sm text-zinc-300">Create at least 2 teams</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] bg-green-500 border-green-500">✓</div>
              <span className="text-sm text-zinc-300">Set up resource catalog</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px]">3</div>
              <span className="text-sm text-zinc-300">Assign a judge</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px]">4</div>
              <span className="text-sm text-zinc-300">Verify projector connection</span>
            </div>
            <Button 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white border-none"
              onClick={handleLaunch}
              disabled={launching}
            >
              {launching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              Launch Event
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
