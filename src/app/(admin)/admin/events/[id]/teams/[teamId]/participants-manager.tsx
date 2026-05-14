'use client'

import { useRef, useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Crown, User, Trash2, Loader2, Pencil, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  addParticipant,
  removeParticipant,
  updateParticipant,
} from '@/app/actions/participants'
import { uploadAvatarAction } from '@/app/actions/uploads'
import type { ParticipantRow } from '@/lib/participants'

type RoleValue = 'captain' | 'member'

interface FormState {
  full_name: string
  designation: string
  email: string
  avatar_url: string
  role: RoleValue
}

function emptyForm(): FormState {
  return { full_name: '', designation: '', email: '', avatar_url: '', role: 'member' }
}

export function ParticipantsManager({
  teamId,
  participants,
}: {
  teamId: string
  participants: ParticipantRow[]
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(emptyForm())
  const [addUploading, setAddUploading] = useState(false)

  const [editing, setEditing] = useState<ParticipantRow | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [editUploading, setEditUploading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const captain = participants.find((p) => p.role === 'captain')
  const members = participants.filter((p) => p.role !== 'captain')

  function openEdit(p: ParticipantRow) {
    setEditing(p)
    setEditForm({
      full_name: p.full_name,
      designation: p.designation ?? '',
      email: p.email ?? '',
      avatar_url: p.avatar_url ?? '',
      role: (p.role as RoleValue) === 'captain' ? 'captain' : 'member',
    })
  }

  async function uploadAvatar(file: File, setter: (url: string) => void, setUploading: (b: boolean) => void) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadAvatarAction(fd)
    setUploading(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setter(result.url)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const result = await addParticipant(teamId, {
      full_name: addForm.full_name,
      designation: addForm.designation,
      email: addForm.email,
      avatar_url: addForm.avatar_url,
      role: addForm.role,
    })
    setAdding(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Added ${addForm.full_name}`)
    setAddForm(emptyForm())
    setAddOpen(false)
    router.refresh()
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setUpdating(true)
    const result = await updateParticipant(editing.id, {
      full_name: editForm.full_name,
      designation: editForm.designation,
      email: editForm.email,
      avatar_url: editForm.avatar_url,
      role: editForm.role,
    })
    setUpdating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Participant updated')
    setEditing(null)
    router.refresh()
  }

  async function handleRemove(p: ParticipantRow) {
    if (!confirm(`Remove ${p.full_name} from the team?`)) return
    setRemovingId(p.id)
    const result = await removeParticipant(p.id)
    setRemovingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Participant removed')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-zinc-900">Participants</h3>
          <p className="text-sm text-zinc-500">
            {captain ? (
              <>Captain: <span className="font-medium text-zinc-700">{captain.full_name}</span> · </>
            ) : (
              <>No captain assigned · </>
            )}
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setAddForm(emptyForm()) }}>
          <DialogTrigger render={<Button className="gap-2 h-10" />}>
            <Plus className="w-4 h-4" />
            Add participant
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add participant</DialogTitle>
                <DialogDescription>
                  Setting role to Captain reassigns any existing captain to Member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <AvatarPicker
                  url={addForm.avatar_url}
                  uploading={addUploading}
                  onPick={(f) =>
                    uploadAvatar(f, (url) => setAddForm((s) => ({ ...s, avatar_url: url })), setAddUploading)
                  }
                  onClear={() => setAddForm((s) => ({ ...s, avatar_url: '' }))}
                />
                <div className="space-y-2">
                  <Label htmlFor="p-name">Full name</Label>
                  <Input
                    id="p-name"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm((s) => ({ ...s, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-designation">Designation</Label>
                    <Input
                      id="p-designation"
                      placeholder="e.g. Engineer"
                      value={addForm.designation}
                      onChange={(e) => setAddForm((s) => ({ ...s, designation: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-email">Email</Label>
                    <Input
                      id="p-email"
                      type="email"
                      placeholder="optional"
                      value={addForm.email}
                      onChange={(e) => setAddForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <RadioGroup
                    value={addForm.role}
                    onValueChange={(v) => setAddForm((s) => ({ ...s, role: v as RoleValue }))}
                    className="flex flex-col gap-2"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="member" />
                      <User className="w-4 h-4 text-zinc-500" />
                      Member
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="captain" />
                      <Crown className="w-4 h-4 text-amber-500" />
                      Captain (one per team)
                    </label>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={adding || addUploading}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200/80">
        <CardContent className="p-0">
          {participants.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-zinc-900">No participants yet</p>
                <p className="text-zinc-500 text-sm">Add a captain and team members to get started.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-20">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <Avatar url={p.avatar_url} name={p.full_name} />
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900">{p.full_name}</TableCell>
                    <TableCell className="text-zinc-600">{p.designation || <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-zinc-600">{p.email || <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell>
                      {p.role === 'captain' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Crown className="w-3 h-3" />
                          Captain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                          <User className="w-3 h-3" />
                          Member
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive gap-1.5"
                        onClick={() => handleRemove(p)}
                        disabled={removingId === p.id}
                      >
                        {removingId === p.id ? (
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
              <DialogTitle>Edit participant</DialogTitle>
              <DialogDescription>
                Reassigning Captain will demote the previous captain to Member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <AvatarPicker
                url={editForm.avatar_url}
                uploading={editUploading}
                onPick={(f) =>
                  uploadAvatar(f, (url) => setEditForm((s) => ({ ...s, avatar_url: url })), setEditUploading)
                }
                onClear={() => setEditForm((s) => ({ ...s, avatar_url: '' }))}
              />
              <div className="space-y-2">
                <Label htmlFor="edit-p-name">Full name</Label>
                <Input
                  id="edit-p-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((s) => ({ ...s, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-p-designation">Designation</Label>
                  <Input
                    id="edit-p-designation"
                    value={editForm.designation}
                    onChange={(e) => setEditForm((s) => ({ ...s, designation: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-p-email">Email</Label>
                  <Input
                    id="edit-p-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <RadioGroup
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((s) => ({ ...s, role: v as RoleValue }))}
                  className="flex flex-col gap-2"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="member" />
                    <User className="w-4 h-4 text-zinc-500" />
                    Member
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="captain" />
                    <Crown className="w-4 h-4 text-amber-500" />
                    Captain (one per team)
                  </label>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={updating || editUploading}>
                {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  if (url) {
    return (
      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-100">
        <Image src={url} alt={name} fill sizes="36px" className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-medium">
      {initials || '—'}
    </div>
  )
}

function AvatarPicker({
  url,
  uploading,
  onPick,
  onClear,
}: {
  url: string
  uploading: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
      <div className="relative w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        ) : url ? (
          <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
        ) : (
          <Upload className="w-5 h-5 text-zinc-400" />
        )}
      </div>
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {url ? 'Replace photo' : 'Upload photo'}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-zinc-500">
            <X className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
