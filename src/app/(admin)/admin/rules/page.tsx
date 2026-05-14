'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Gavel, Mail, Loader2 } from 'lucide-react'
import { inviteJudgeAction } from '@/app/actions/admin-invites'
import { toast } from 'sonner'

export default function RulesAndJudgePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const eventId = 'active-event-id'

  async function handleInvite() {
    if (!email) return
    setLoading(true)
    const result = await inviteJudgeAction(eventId, email)
    
    if (result.success) {
      toast.success(`Invitation sent to ${email}`)
      setEmail('')
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Judge & Rules</h1>
        <p className="text-muted-foreground text-lg">Configure game rules and invite your judge.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-zinc-500" />
              Game Rules & Twists
            </CardTitle>
            <CardDescription>Enable or disable optional game mechanics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="trading" />
              <Label htmlFor="trading">Enable Trading Window (5 minutes at 50% mark)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="mystery" />
              <Label htmlFor="mystery">Allow Mystery Resource Drops</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="bullseye" />
              <Label htmlFor="bullseye">Bullseye Bonus (+5 pts for landing in target)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="presentation" defaultChecked />
              <Label htmlFor="presentation">Award Presentation Points (up to +5 pts)</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-zinc-500" />
              Assign Judge
            </CardTitle>
            <CardDescription>The judge will receive an email invitation to their console.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="judge-email">Judge Email</Label>
                <Input 
                  id="judge-email" 
                  type="email" 
                  placeholder="judge@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleInvite} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Invitation
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t text-sm text-muted-foreground">
              Alternatively, you can share the direct projector link from the sidebar.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
