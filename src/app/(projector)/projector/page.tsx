'use client'

import { useEvent } from '@/hooks/use-event'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useActivityLog } from '@/hooks/use-activity-log'
import { RealtimeTimer } from '@/components/game/realtime-timer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Loader2, Trophy, Activity, AlertTriangle } from 'lucide-react'
import { useResources } from '@/hooks/use-resources'

export default function ProjectorView() {
  const eventId = 'active-event-id'
  const { event, loading: eventLoading } = useEvent(eventId)
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard(eventId)
  const { logs } = useActivityLog(eventId)
  const { resources } = useResources(eventId)

  const lowStockResources = resources.filter(r => r.stock_remaining > 0 && r.stock_remaining <= 2)

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-2 uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
            {event?.name || 'Egg Drop Challenge'}
          </h1>
          <p className="text-2xl text-zinc-500 font-medium">
            {event?.venue} | Phase: <span className="text-blue-500 uppercase">{event?.current_phase.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="scale-150 transform origin-right">
          <RealtimeTimer endsAt={event?.timer_ends_at || null} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Leaderboard */}
        <div className="col-span-8 space-y-8">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-4">
              <Trophy className="w-10 h-10 text-yellow-500" />
              <CardTitle className="text-3xl font-bold uppercase tracking-widest text-zinc-400">Live Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xl text-zinc-500">Rank</TableHead>
                    <TableHead className="text-xl text-zinc-500">Team</TableHead>
                    <TableHead className="text-xl text-zinc-500 text-center">Egg</TableHead>
                    <TableHead className="text-xl text-zinc-500 text-center">Design</TableHead>
                    <TableHead className="text-xl text-zinc-500 text-center">Budget</TableHead>
                    <TableHead className="text-xl text-zinc-200 text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, index) => (
                      <TableRow key={entry.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors h-20">
                        <TableCell className="text-3xl font-black italic text-zinc-600">
                          #{index + 1}
                        </TableCell>
                        <TableCell className="text-2xl font-bold">
                          <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.team_color || '#fff' }} />
                            {entry.team_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-2xl text-center font-mono">{entry.egg_integrity_score}</TableCell>
                        <TableCell className="text-2xl text-center font-mono">{entry.innovation_score}</TableCell>
                        <TableCell className="text-2xl text-center font-mono">{entry.budget_efficiency_score}</TableCell>
                        <TableCell className="text-4xl text-right font-black text-blue-500 font-mono">
                          {entry.total_score}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-zinc-500 text-2xl italic">
                        No scores recorded yet. Results will appear here after the drop test.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity & Alerts */}
        <div className="col-span-4 space-y-8">
          {/* Activity Log */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-4">
              <Activity className="w-8 h-8 text-blue-500" />
              <CardTitle className="text-2xl font-bold uppercase tracking-wider text-zinc-400">Market Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="flex flex-col border-l-2 border-zinc-700 pl-4 py-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-zinc-300 text-lg">{log.team_name}</span>
                        <span className="text-xs text-zinc-600 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {log.action === 'purchase' ? (
                          <>Bought <span className="text-white">{log.details.item}</span> x{log.details.qty}</>
                        ) : log.action === 'phase_transition' ? (
                          <>Phase changed: <span className="text-blue-400">{log.details.to}</span></>
                        ) : (
                          log.action.replace('_', ' ')
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-600 italic">Waiting for activity...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          {lowStockResources.length > 0 && (
            <Card className="bg-red-900/20 border-red-900/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <CardTitle className="text-2xl font-bold uppercase tracking-wider text-red-500">Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockResources.map((resource) => (
                    <div key={resource.id} className="flex justify-between items-center bg-red-900/20 p-3 rounded border border-red-900/30">
                      <span className="font-bold text-lg text-red-200">{resource.name}</span>
                      <span className="font-mono font-black text-red-500 bg-red-100 px-2 rounded">{resource.stock_remaining} LEFT</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
