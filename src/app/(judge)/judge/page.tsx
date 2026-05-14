'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { useTeams } from '@/hooks/use-teams'
import { useEvent } from '@/hooks/use-event'
import { submitScoreAction } from '@/app/actions/scoring'
import { toast } from 'sonner'
import { Gavel, Loader2, CheckCircle2 } from 'lucide-react'

export default function JudgeConsole() {
  const eventId = 'active-event-id'
  const { event } = useEvent(eventId)
  const { teams, loading: teamsLoading } = useTeams(eventId)
  
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [eggStatus, setEggStatus] = useState<'intact' | 'hairline' | 'cracked' | 'broken'>('intact')
  const [shieldStatus, setShieldStatus] = useState<'intact' | 'minor' | 'partial' | 'destroyed'>('intact')
  const [innovation, setInnovation] = useState(15)
  const [presentation, setPresentation] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  async function handleSubmit() {
    if (!selectedTeamId) return
    
    setSubmitting(true)
    const result = await submitScoreAction({
      eventId,
      teamId: selectedTeamId,
      eggStatus,
      shieldStatus,
      innovationScore: innovation,
      presentationBonus: presentation
    })

    if (result.success) {
      toast.success(`Score submitted for ${selectedTeam?.name}`)
      setSelectedTeamId(null)
      // Reset form
      setEggStatus('intact')
      setShieldStatus('intact')
      setInnovation(15)
      setPresentation(0)
    } else {
      toast.error(result.error)
    }
    setSubmitting(false)
  }

  if (teamsLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gavel className="w-8 h-8 text-zinc-500" />
            Judge Console
          </h1>
          <p className="text-muted-foreground">Record drop results and award scores.</p>
        </div>
        <div className="bg-zinc-100 px-4 py-2 rounded-lg text-sm font-medium">
          Phase: <span className="text-blue-600 uppercase tracking-wider">{event?.current_phase || '---'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Queue */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Select a team to score.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full text-left p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                    selectedTeamId === team.id ? 'bg-zinc-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#ccc' }} />
                    <span className="font-medium">{team.name}</span>
                  </div>
                  {/* Status indicator could go here */}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scoring Form */}
        <Card className="lg:col-span-2">
          {selectedTeam ? (
            <>
              <CardHeader>
                <CardTitle>Scoring: {selectedTeam.name}</CardTitle>
                <CardDescription>Evaluate the drop performance based on the rubric.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* 1. Egg Integrity */}
                <div className="space-y-4">
                  <Label className="text-base font-bold">1. Egg Integrity (40 pts)</Label>
                  <RadioGroup value={eggStatus} onValueChange={(v: any) => setEggStatus(v)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="egg-intact" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="intact" id="egg-intact" className="sr-only" />
                      <span className="font-bold">Intact</span>
                      <span className="text-xs text-muted-foreground">40 pts</span>
                    </Label>
                    <Label htmlFor="egg-hairline" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="hairline" id="egg-hairline" className="sr-only" />
                      <span className="font-bold">Hairline</span>
                      <span className="text-xs text-muted-foreground">25 pts</span>
                    </Label>
                    <Label htmlFor="egg-cracked" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="cracked" id="egg-cracked" className="sr-only" />
                      <span className="font-bold">Cracked</span>
                      <span className="text-xs text-muted-foreground">10 pts</span>
                    </Label>
                    <Label htmlFor="egg-broken" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="broken" id="egg-broken" className="sr-only" />
                      <span className="font-bold">Broken</span>
                      <span className="text-xs text-muted-foreground">0 pts</span>
                    </Label>
                  </RadioGroup>
                </div>

                {/* 2. Shield Integrity */}
                <div className="space-y-4">
                  <Label className="text-base font-bold">2. Shield Integrity (20 pts)</Label>
                  <RadioGroup value={shieldStatus} onValueChange={(v: any) => setShieldStatus(v)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="shield-intact" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="intact" id="shield-intact" className="sr-only" />
                      <span className="font-bold">Fully Intact</span>
                      <span className="text-xs text-muted-foreground">20 pts</span>
                    </Label>
                    <Label htmlFor="shield-minor" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="minor" id="shield-minor" className="sr-only" />
                      <span className="font-bold">Minor Damage</span>
                      <span className="text-xs text-muted-foreground">15 pts</span>
                    </Label>
                    <Label htmlFor="shield-partial" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="partial" id="shield-partial" className="sr-only" />
                      <span className="font-bold">Partial Damage</span>
                      <span className="text-xs text-muted-foreground">10 pts</span>
                    </Label>
                    <Label htmlFor="shield-destroyed" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-blue-500">
                      <RadioGroupItem value="destroyed" id="shield-destroyed" className="sr-only" />
                      <span className="font-bold">Destroyed</span>
                      <span className="text-xs text-muted-foreground">0 pts</span>
                    </Label>
                  </RadioGroup>
                </div>

                {/* 3. Innovation */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label className="text-base font-bold">3. Design Innovation (0-20 pts)</Label>
                    <span className="font-mono font-bold text-blue-600">{innovation} pts</span>
                  </div>
                  <Slider 
                    value={[innovation]} 
                    onValueChange={(v) => setInnovation(Array.isArray(v) ? v[0] : v)} 
                    max={20} 
                    step={1} 
                  />
                </div>

                {/* 4. Presentation */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label className="text-base font-bold">4. Presentation Bonus (0-5 pts)</Label>
                    <span className="font-mono font-bold text-green-600">+{presentation} pts</span>
                  </div>
                  <Slider 
                    value={[presentation]} 
                    onValueChange={(v) => setPresentation(Array.isArray(v) ? v[0] : v)} 
                    max={5} 
                    step={1} 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-6">
                <Button variant="ghost" onClick={() => setSelectedTeamId(null)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                  Submit Final Score
                </Button>
              </CardFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] text-center p-8 text-zinc-400">
              <Gavel className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium">No Team Selected</h3>
              <p className="max-w-xs">Please select a team from the list on the left to begin the scoring rubric.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
