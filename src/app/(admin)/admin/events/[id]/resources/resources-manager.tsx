'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Package, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createResource,
  deleteResource,
  updateResource,
} from '@/app/actions/resources'
import {
  RESOURCE_CATEGORIES,
  type ResourceCategory,
  type ResourceRow,
} from '@/lib/resources'

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  cushioning: 'Cushioning',
  structural: 'Structural',
  drag: 'Drag',
  adhesive: 'Adhesive',
  wildcard: 'Wildcard',
}

const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  cushioning: 'bg-rose-100 text-rose-800',
  structural: 'bg-sky-100 text-sky-800',
  drag: 'bg-violet-100 text-violet-800',
  adhesive: 'bg-amber-100 text-amber-800',
  wildcard: 'bg-emerald-100 text-emerald-800',
}

export function ResourcesManager({
  eventId,
  resources,
}: {
  eventId: string
  resources: ResourceRow[]
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ResourceCategory>('cushioning')
  const [price, setPrice] = useState('100')
  const [stock, setStock] = useState('20')

  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [eName, setEName] = useState('')
  const [eCategory, setECategory] = useState<ResourceCategory>('cushioning')
  const [ePrice, setEPrice] = useState('100')
  const [eStock, setEStock] = useState('20')
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function resetCreate() {
    setName('')
    setCategory('cushioning')
    setPrice('100')
    setStock('20')
  }

  function openEdit(r: ResourceRow) {
    setEditing(r)
    setEName(r.name)
    setECategory((r.category as ResourceCategory) ?? 'cushioning')
    setEPrice(String(r.price_credits))
    setEStock(String(r.stock_total))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const result = await createResource(eventId, {
      name,
      category,
      price_credits: parseFloat(price),
      stock_total: parseInt(stock, 10),
    })
    setAdding(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Added ${name}`)
    resetCreate()
    setAddOpen(false)
    router.refresh()
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setUpdating(true)
    const result = await updateResource(editing.id, {
      name: eName,
      category: eCategory,
      price_credits: parseFloat(ePrice),
      stock_total: parseInt(eStock, 10),
    })
    setUpdating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Resource updated')
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(r: ResourceRow) {
    if (!confirm(`Remove "${r.name}" from this event's catalog?`)) return
    setDeletingId(r.id)
    const result = await deleteResource(r.id)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Resource removed')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900">Resources</h2>
          <p className="text-zinc-500 text-sm">
            The marketplace catalog teams will buy from. Add or edit items and set their price + stock.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button className="gap-2 h-10" />}>
            <Plus className="w-4 h-4" />
            Add resource
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add resource</DialogTitle>
                <DialogDescription>Set the item name, category, price, and stock available to teams.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="r-name">Item name</Label>
                  <Input
                    id="r-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Cotton Balls (10 pack)"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="r-category">Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as ResourceCategory)}>
                      <SelectTrigger id="r-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-price">Price (CR)</Label>
                    <Input
                      id="r-price"
                      type="number"
                      min="0"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-stock">Stock</Label>
                    <Input
                      id="r-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add resource
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200/80">
        <CardContent className="p-0">
          {resources.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
                <Package className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-zinc-900">No resources yet</p>
                <p className="text-zinc-500 text-sm">Click <strong>Add resource</strong> to populate the catalog.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock (left / total)</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((r) => {
                  const cat = (r.category as ResourceCategory) ?? null
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-6 font-medium text-zinc-900">
                        <span className="inline-flex items-center gap-2">
                          <Package className="w-4 h-4 text-zinc-400" />
                          {r.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cat ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}
                          >
                            {CATEGORY_LABELS[cat]}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-zinc-900">
                          {Number(r.price_credits).toFixed(0)}{' '}
                          <span className="text-[10px] text-zinc-400">CR</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-zinc-700">
                          {r.stock_remaining} / {r.stock_total}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive gap-1.5"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit resource</DialogTitle>
              <DialogDescription>
                Changing the stock total adjusts what's available — already-consumed stock is preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="er-name">Item name</Label>
                <Input id="er-name" value={eName} onChange={(e) => setEName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="er-category">Category</Label>
                  <Select value={eCategory} onValueChange={(v) => setECategory(v as ResourceCategory)}>
                    <SelectTrigger id="er-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="er-price">Price (CR)</Label>
                  <Input
                    id="er-price"
                    type="number"
                    min="0"
                    step="1"
                    value={ePrice}
                    onChange={(e) => setEPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="er-stock">Stock</Label>
                  <Input
                    id="er-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={eStock}
                    onChange={(e) => setEStock(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={updating}>
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
