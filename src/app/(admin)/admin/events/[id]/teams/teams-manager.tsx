'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Plus,
  Users,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  Pencil,
  Trash2,
  Crown,
  Upload,
  X,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { createTeam, updateTeam, deleteTeam, type TeamRow } from '@/app/actions/teams'
import { uploadAvatarAction } from '@/app/actions/uploads'

interface MemberDraft {
  key: string
  full_name: string
  designation: string
  email: string
  avatar_url: string
  uploading: boolean
  role: 'captain' | 'member'
}

function blankMember(role: 'captain' | 'member' = 'member'): MemberDraft {
  return {
    key: crypto.randomUUID(),
    full_name: '',
    designation: '',
    email: '',
    avatar_url: '',
    uploading: false,
    role,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function TeamsManager({
  eventId,
  eventName,
  teams,
}: {
  eventId: string
  eventName: string
  teams: TeamRow[]
}) {
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TeamRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // wizard state
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [budget, setBudget] = useState('2000')
  const [memberCount, setMemberCount] = useState('4')
  const [members, setMembers] = useState<MemberDraft[]>([])

  // edit form state
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#7c3aed')
  const [editBudget, setEditBudget] = useState('2000')

  function resetWizard() {
    setStep(1)
    setName('')
    setColor('#7c3aed')
    setBudget('2000')
    setMemberCount('4')
    setMembers([])
  }

  function startStep2() {
    const count = clamp(parseInt(memberCount, 10) || 0, 1, 10)
    setMemberCount(String(count))
    const arr: MemberDraft[] = []
    for (let i = 0; i < count; i++) {
      arr.push(blankMember(i === 0 ? 'captain' : 'member'))
    }
    setMembers(arr)
    setStep(2)
  }

  function updateMember(key: string, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  }

  function setCaptain(key: string) {
    setMembers((prev) =>
      prev.map((m) => ({ ...m, role: m.key === key ? 'captain' : 'member' })),
    )
  }

  function removeRow(key: string) {
    setMembers((prev) => {
      const next = prev.filter((m) => m.key !== key)
      if (!next.some((m) => m.role === 'captain') && next.length > 0) {
        next[0].role = 'captain'
      }
      return next
    })
  }

  function addRow() {
    setMembers((prev) => [...prev, blankMember(prev.length === 0 ? 'captain' : 'member')])
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
    toast.success('Join code copied')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function handleUploadAvatar(key: string, file: File) {
    updateMember(key, { uploading: true })
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadAvatarAction(fd)
    if ('error' in result) {
      toast.error(result.error)
      updateMember(key, { uploading: false })
      return
    }
    updateMember(key, { uploading: false, avatar_url: result.url })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (members.some((m) => !m.full_name.trim())) {
      toast.error('Every member needs a name.')
      return
    }
    const captain = members.find((m) => m.role === 'captain')
    if (!captain) {
      toast.error('Pick one member as captain.')
      return
    }
    setCreating(true)
    const result = await createTeam({
      eventId,
      name,
      color,
      budget: parseFloat(budget),
      participants: members.map((m) => ({
        full_name: m.full_name,
        designation: m.designation,
        email: m.email,
        avatar_url: m.avatar_url,
        role: m.role,
      })),
    })
    setCreating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Team "${result.teamName}" created · code ${result.joinCode}`)
    if (result.emailStatus === 'sent') {
      toast.success(`Join code emailed to ${result.captainEmail}`)
    } else if (result.emailStatus === 'failed') {
      toast.error(`Email failed: ${result.emailError ?? 'unknown error'}`)
    } else if (!captain.email) {
      toast.message('Captain has no email — copy the join code from the table.')
    }
    resetWizard()
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
    toast.success('Team updated.')
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(team: TeamRow) {
    if (!confirm(`Delete "${team.name}"? This removes its wallet and members.`)) return
    setDeletingId(team.id)
    const result = await deleteTeam(team.id)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Team removed.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900">Teams</h2>
          <p className="text-zinc-500 text-sm">
            Managing teams for <span className="font-medium text-zinc-700">{eventName}</span>.
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) resetWizard()
          }}
        >
          <DialogTrigger render={<Button className="gap-2 h-10" />}>
            <Plus className="w-4 h-4" />
            Add team
          </DialogTrigger>
          <DialogContent className={step === 2 ? 'sm:max-w-4xl' : ''}>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{step === 1 ? 'Create team' : `Add members — ${name || 'New team'}`}</DialogTitle>
                <DialogDescription>
                  {step === 1
                    ? 'Set the basics, then add each member on the next step.'
                    : 'Fill in each member, mark one as Captain. The Captain receives the join code by email.'}
                </DialogDescription>
              </DialogHeader>

              {step === 1 ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      placeholder="e.g. Team Falcons"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-color">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="team-color"
                          type="color"
                          className="w-12 p-1 h-10"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                        />
                        <Input
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="flex-1 font-mono uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Initial budget (CR)</Label>
                      <Input
                        id="budget"
                        type="number"
                        min="0"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-[16rem]">
                    <Label htmlFor="member-count">Number of members</Label>
                    <Input
                      id="member-count"
                      type="number"
                      min="1"
                      max="10"
                      value={memberCount}
                      onChange={(e) => setMemberCount(e.target.value)}
                      required
                    />
                    <p className="text-xs text-zinc-500">Min 1, max 10. You can add more rows on the next step.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4 max-h-[60vh] overflow-auto">
                  <MembersTable
                    members={members}
                    onChange={updateMember}
                    onSetCaptain={setCaptain}
                    onRemove={removeRow}
                    onUploadAvatar={handleUploadAvatar}
                  />
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add another row
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {step === 1 ? (
                  <>
                    <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!name.trim()) {
                          toast.error('Team name is required.')
                          return
                        }
                        startStep2()
                      }}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Create team
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200/80">
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
                <Users className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-zinc-900">No teams yet</p>
                <p className="text-zinc-500 text-sm">Click <strong>Add team</strong> to create one.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Team</TableHead>
                  <TableHead>Join code</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link
                        href={`/admin/events/${eventId}/teams/${team.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: team.color || '#999' }}
                        />
                        <span className="group-hover:underline">{team.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          team.join_code && copyToClipboard(team.join_code)
                        }}
                        className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-sm font-mono hover:bg-zinc-200 transition-colors"
                      >
                        {team.join_code ?? '—'}
                        {copiedCode === team.join_code ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-zinc-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-zinc-700">
                        <Users className="w-4 h-4 text-zinc-400" />
                        {team.member_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-zinc-700">
                        {team.remaining_balance.toFixed(0)} / {team.total_budget.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium capitalize">
                        {team.status || 'active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(team)} className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive gap-1.5"
                        onClick={() => handleDelete(team)}
                        disabled={deletingId === team.id}
                      >
                        {deletingId === team.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit team</DialogTitle>
              <DialogDescription>Update the team's name, color, or budget. Spent credits are preserved.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Team name</Label>
                <Input id="edit-team-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-team-color"
                    type="color"
                    className="w-12 p-1 h-10"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                  <Input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1 font-mono uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Total budget (CR)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  min="0"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MembersTable({
  members,
  onChange,
  onSetCaptain,
  onRemove,
  onUploadAvatar,
}: {
  members: MemberDraft[]
  onChange: (key: string, patch: Partial<MemberDraft>) => void
  onSetCaptain: (key: string) => void
  onRemove: (key: string) => void
  onUploadAvatar: (key: string, file: File) => void
}) {
  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 w-10">#</TableHead>
            <TableHead className="w-20">Photo</TableHead>
            <TableHead>Name *</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-28 text-center">Captain</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m, idx) => (
            <MemberRow
              key={m.key}
              index={idx}
              member={m}
              onChange={(patch) => onChange(m.key, patch)}
              onMakeCaptain={() => onSetCaptain(m.key)}
              onRemove={() => onRemove(m.key)}
              onUpload={(file) => onUploadAvatar(m.key, file)}
              canRemove={members.length > 1}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberRow({
  index,
  member,
  onChange,
  onMakeCaptain,
  onRemove,
  onUpload,
  canRemove,
}: {
  index: number
  member: MemberDraft
  onChange: (patch: Partial<MemberDraft>) => void
  onMakeCaptain: () => void
  onRemove: () => void
  onUpload: (file: File) => void
  canRemove: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const isCaptain = member.role === 'captain'

  return (
    <TableRow>
      <TableCell className="pl-4 text-zinc-400 align-middle">{index + 1}</TableCell>
      <TableCell className="align-middle">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={member.uploading}
          className="relative w-11 h-11 rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center overflow-hidden hover:border-zinc-400 transition-colors"
          title={member.avatar_url ? 'Replace photo' : 'Upload photo'}
        >
          {member.uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          ) : member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt=""
              fill
              className="object-cover"
              sizes="44px"
              unoptimized
            />
          ) : (
            <Upload className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </TableCell>
      <TableCell className="align-middle">
        <Input
          placeholder="Full name"
          value={member.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          required
        />
      </TableCell>
      <TableCell className="align-middle">
        <Input
          placeholder="e.g. Engineer"
          value={member.designation}
          onChange={(e) => onChange({ designation: e.target.value })}
        />
      </TableCell>
      <TableCell className="align-middle">
        <Input
          type="email"
          placeholder={isCaptain ? 'captain@company.com' : 'optional'}
          value={member.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </TableCell>
      <TableCell className="text-center align-middle">
        <button
          type="button"
          onClick={onMakeCaptain}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isCaptain
              ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          }`}
        >
          <Crown className={`w-3.5 h-3.5 ${isCaptain ? '' : 'text-zinc-400'}`} />
          {isCaptain ? 'Captain' : 'Set as'}
        </button>
      </TableCell>
      <TableCell className="align-middle pr-2">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1.5 text-zinc-400 hover:text-destructive disabled:opacity-30 disabled:hover:text-zinc-400"
          title="Remove row"
        >
          <X className="w-4 h-4" />
        </button>
      </TableCell>
    </TableRow>
  )
}
