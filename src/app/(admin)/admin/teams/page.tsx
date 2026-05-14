'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Users, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  color: string
  join_code: string
  memberCount: number
}

export default function TeamsManagerPage() {
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'Team Eagles', color: '#10b981', join_code: 'EGLE26', memberCount: 4 },
    { id: '2', name: 'Team Phoenix', color: '#0ea5e9', join_code: 'PHNX77', memberCount: 3 },
  ])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Join code copied!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teams Manager</h1>
          <p className="text-muted-foreground text-lg">Create and manage teams for this event.</p>
        </div>
        
        <Dialog>
          <DialogTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="w-4 h-4" />
            Add Team
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Add a team and generate a join code for participants.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input id="team-name" placeholder="e.g. Team Falcons" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-color">Team Color</Label>
                <div className="flex gap-2">
                  <Input id="team-color" type="color" className="w-12 p-1 h-10" defaultValue="#7c3aed" />
                  <Input placeholder="#7c3aed" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Initial Budget (credits)</Label>
                <Input id="budget" type="number" defaultValue="2000" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Team</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Team Name</TableHead>
                  <TableHead>Join Code</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: team.color }}
                        />
                        {team.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => copyToClipboard(team.join_code)}
                        className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-sm font-mono hover:bg-zinc-200 transition-colors"
                      >
                        {team.join_code}
                        {copiedCode === team.join_code ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-zinc-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-zinc-400" />
                        {team.memberCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive">Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
