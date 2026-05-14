'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Users, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createTeam, updateTeam, deleteTeam, type TeamRow } from '@/app/actions/teams'

export function TeamsManager({
  event,
  teams,
}: {
  event: { id: string; name: string } | null
  teams: TeamRow[]
}) {
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TeamRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // create form state
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [budget, setBudget] = useState('2000')
  const [captainEmail, setCaptainEmail] = useState('')

  // edit form state
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#7c3aed')
  const [editBudget, setEditBudget] = useState('2000')

  function resetCreateForm() {
    setName('')
    setColor('#7c3aed')
    setBudget('2000')
    setCaptainEmail('')
  }

  function openEdit(team: TeamRow) {
    setEditing(team)
    setEditName(team.name)
    setEditColor(team.color || '#7c3aed')
    setEditBudget(String(team.total_budget))
  }

  async function copyToClipboard(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Join code copied!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const result = await createTeam({
      name,
      color,
      budget: parseFloat(budget),
      captainEmail: captainEmail.trim() || null,
    })
    setCreating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Team created (join code: ${result.joinCode})`)
    if (result.emailStatus === 'sent') {
      toast.success(`Join code emailed to ${captainEmail.trim()}`)
    } else if (result.emailStatus === 'failed') {
      toast.error(`Team created but email failed: ${result.emailError ?? 'unknown error'}`)
    }
    resetCreateForm()
    setCreateOpen(false)
    router.refresh()
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setUpdating(true)
    const result = await updateTeam({
      teamId: editing.id,
      name: editName,
      color: editColor,
      budget: parseFloat(editBudget),
    })
    setUpdating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Team updated')
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(team: TeamRow) {
    if (!confirm(`Delete team "${team.name}"? This also removes its wallet and members.`)) {
      return
    }
    setDeletingId(team.id)
    const result = await deleteTeam(team.id)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Team removed')
    router.refresh()
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No event configured yet. Visit <a className="underline" href="/admin/setup">Event Setup</a> to create one before managing teams.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teams Manager</h1>
          <p className="text-muted-foreground text-lg">
            Managing teams for <span className="font-medium">{event.name}</span>.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="w-4 h-4" />
            Add Team
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>Add a team and generate a join code for participants.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input id="team-name" placeholder="e.g. Team Falcons" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-color">Team Color</Label>
                  <div className="flex gap-2">
                    <Input id="team-color" type="color" className="w-12 p-1 h-10" value={color} onChange={(e) => setColor(e.target.value)} />
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Initial Budget (credits)</Label>
                  <Input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captain-email">Captain Email <span className="text-xs text-muted-foreground">(optional — sends the join code)</span></Label>
                  <Input id="captain-email" type="email" placeholder="captain@company.com" value={captainEmail} onChange={(e) => setCaptainEmail(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Team
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Team Name</TableHead>
                <TableHead>Join Code</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No teams yet. Click <strong>Add Team</strong> to create one.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#999' }} />
                        {team.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => team.join_code && copyToClipboard(team.join_code)}
                        className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-sm font-mono hover:bg-zinc-200 transition-colors"
                      >
                        {team.join_code ?? '—'}
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
                        {team.member_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {team.remaining_balance.toFixed(0)} / {team.total_budget.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
                        {team.status || 'active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(team)}
                        disabled={deletingId === team.id}
                      >
                        {deletingId === team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>Update team details. Spent credits are preserved.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Team Name</Label>
                <Input id="edit-team-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team-color">Team Color</Label>
                <div className="flex gap-2">
                  <Input id="edit-team-color" type="color" className="w-12 p-1 h-10" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                  <Input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Total Budget (credits)</Label>
                <Input id="edit-budget" type="number" min="0" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
