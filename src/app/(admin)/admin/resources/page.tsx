'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Package, ShoppingCart } from 'lucide-react'

interface Resource {
  id: string
  name: string
  category: string
  price: number
  stock: number
}

const CATEGORIES = ['Cushioning', 'Structural', 'Drag', 'Adhesive', 'Wildcard']

export default function ResourcesCatalogPage() {
  const [resources, setResources] = useState<Resource[]>([
    { id: '1', name: 'Bubble Wrap (1 sq ft)', category: 'Cushioning', price: 80, stock: 20 },
    { id: '2', name: 'Drinking Straws (20 pack)', category: 'Structural', price: 60, stock: 25 },
    { id: '3', name: 'Mini Parachute Kit', category: 'Wildcard', price: 300, stock: 4 },
  ])

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold">Resource Catalog</h1>
          <p className="text-muted-foreground text-lg">Define the items available in the marketplace.</p>
        </div>
        
        <Dialog>
          <DialogTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="w-4 h-4" />
            Add Item
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resource Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Item Name</Label>
                <Input id="item-name" placeholder="e.g. Cotton Balls (pack of 10)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (credits)</Label>
                  <Input id="price" type="number" defaultValue="50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input id="stock" type="number" defaultValue="20" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Add to Catalog</Button>
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
                  <TableHead className="pl-6">Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-zinc-400" />
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-zinc-100 rounded-full text-xs font-medium">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {item.price} <span className="text-[10px] text-zinc-400">CR</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-4 h-4 text-zinc-400" />
                        {item.stock}
                      </div>
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
