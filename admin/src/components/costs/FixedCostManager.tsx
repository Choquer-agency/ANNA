'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Id } from '@convex/_generated/dataModel'

interface FixedCost {
  _id: Id<'admin_fixed_costs'>
  name: string
  amountCents: number
  category: string
  startDate: string
  endDate?: string
  addedBy: string
  updatedAt: string
}

interface FixedCostManagerProps {
  costs: FixedCost[]
  loading?: boolean
}

export function FixedCostManager({ costs, loading }: FixedCostManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<Id<'admin_fixed_costs'> | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('infrastructure')

  const addCost = useMutation(api.adminMutations.addFixedCost)
  const updateCost = useMutation(api.adminMutations.updateFixedCost)
  const deleteCost = useMutation(api.adminMutations.deleteFixedCost)

  const handleAdd = async () => {
    await addCost({
      name,
      amountCents: Math.round(parseFloat(amount) * 100),
      category,
      startDate: new Date().toISOString(),
    })
    setShowAdd(false)
    resetForm()
  }

  const handleEdit = async () => {
    if (!editId) return
    await updateCost({
      id: editId,
      name,
      amountCents: Math.round(parseFloat(amount) * 100),
      category,
    })
    setEditId(null)
    resetForm()
  }

  const handleDelete = async (id: Id<'admin_fixed_costs'>) => {
    if (confirm('Delete this cost?')) {
      await deleteCost({ id })
    }
  }

  const openEdit = (cost: FixedCost) => {
    setEditId(cost._id)
    setName(cost.name)
    setAmount((cost.amountCents / 100).toString())
    setCategory(cost.category)
  }

  const resetForm = () => {
    setName('')
    setAmount('')
    setCategory('infrastructure')
  }

  const totalMonthlyCents = costs.reduce((sum, c) => sum + c.amountCents, 0)

  if (loading) {
    return <div className="h-48 bg-surface-hover rounded animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-ink-secondary">Fixed Monthly Costs</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">
            Total: {formatCurrency(totalMonthlyCents)}/mo
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Cost
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost) => (
              <TableRow key={cost._id}>
                <TableCell className="text-sm font-medium">{cost.name}</TableCell>
                <TableCell className="text-sm text-ink-secondary capitalize">{cost.category}</TableCell>
                <TableCell className="text-sm">{formatCurrency(cost.amountCents)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cost)} className="p-1 text-ink-tertiary hover:text-ink">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cost._id)} className="p-1 text-ink-tertiary hover:text-danger">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {costs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-ink-tertiary text-sm">
                  No fixed costs added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || editId !== null} onOpenChange={() => { setShowAdd(false); setEditId(null); resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Cost' : 'Add Fixed Cost'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-ink-secondary">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vercel Pro" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-ink-secondary">Monthly Amount ($)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20.00" className="mt-1" step="0.01" min="0" />
            </div>
            <div>
              <label className="text-sm text-ink-secondary">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm bg-surface">
                <option value="infrastructure">Infrastructure</option>
                <option value="tools">Tools</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditId(null); resetForm() }}>Cancel</Button>
            <Button onClick={editId ? handleEdit : handleAdd} disabled={!name || !amount}>
              {editId ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
