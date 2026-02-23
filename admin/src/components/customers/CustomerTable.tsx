'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthBadge } from './HealthBadge'
import { formatDate } from '@/lib/utils'
import { Download, Search, ArrowUpDown } from 'lucide-react'

interface Customer {
  userId: string
  name: string
  email: string
  registeredAt: string
  planId: string
  billingInterval: string | null
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  healthScore: number | null
}

interface CustomerTableProps {
  customers: Customer[]
  loading?: boolean
}

type SortKey = 'name' | 'email' | 'registeredAt' | 'planId' | 'status' | 'healthScore'
type SortDir = 'asc' | 'desc'

function planLabel(planId: string, interval: string | null) {
  if (planId === 'free') return 'Free'
  if (planId === 'lifetime') return 'Lifetime'
  if (interval === 'annual') return 'Pro Annual'
  return 'Pro Monthly'
}

function planBadgeVariant(planId: string) {
  switch (planId) {
    case 'pro': return 'default' as const
    case 'lifetime': return 'default' as const
    default: return 'secondary' as const
  }
}

function exportCSV(customers: Customer[]) {
  const headers = ['Name', 'Email', 'Plan', 'Billing', 'Status', 'Signup Date', 'Health Score']
  const rows = customers.map((c) => [
    c.name,
    c.email,
    c.planId,
    c.billingInterval ?? '',
    c.status,
    c.registeredAt,
    c.healthScore?.toString() ?? '',
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `anna-customers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function CustomerTable({ customers, loading }: CustomerTableProps) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('registeredAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let result = customers

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
    }

    if (planFilter !== 'all') {
      result = result.filter((c) => c.planId === planFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'free') {
        result = result.filter((c) => c.planId === 'free')
      } else {
        result = result.filter((c) => c.status === statusFilter)
      }
    }

    result.sort((a, b) => {
      let cmp = 0
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) cmp = 0
      else if (av === null) cmp = 1
      else if (bv === null) cmp = -1
      else if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [customers, search, planFilter, statusFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-surface-hover rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-surface"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="lifetime">Lifetime</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-surface"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="canceled">Cancelled</option>
          <option value="past_due">Past Due</option>
          <option value="free">Free</option>
        </select>

        <div className="flex-1" />

        <span className="text-sm text-ink-tertiary">{filtered.length} users</span>

        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort('name')} className="cursor-pointer">
                <span className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead onClick={() => toggleSort('email')} className="cursor-pointer">
                <span className="flex items-center gap-1">Email <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead onClick={() => toggleSort('planId')} className="cursor-pointer">
                <span className="flex items-center gap-1">Plan <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead onClick={() => toggleSort('status')} className="cursor-pointer">
                <span className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead onClick={() => toggleSort('registeredAt')} className="cursor-pointer">
                <span className="flex items-center gap-1">Joined <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead onClick={() => toggleSort('healthScore')} className="cursor-pointer">
                <span className="flex items-center gap-1">Health <ArrowUpDown className="w-3 h-3" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => (
              <TableRow key={customer.userId} className="hover:bg-surface-hover">
                <TableCell>
                  <Link
                    href={`/customers/${customer.userId}`}
                    className="text-sm font-medium text-ink hover:text-primary"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-ink-secondary">{customer.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={planBadgeVariant(customer.planId)}
                    className={customer.planId === 'lifetime' ? 'bg-purple-500 text-white' : ''}
                  >
                    {planLabel(customer.planId, customer.billingInterval)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      customer.status === 'active' ? 'text-success border-success' :
                      customer.status === 'trialing' ? 'text-primary border-primary' :
                      customer.status === 'canceled' ? 'text-danger border-danger' :
                      customer.status === 'past_due' ? 'text-warning border-warning' :
                      ''
                    }
                  >
                    {customer.cancelAtPeriodEnd ? 'Cancelling' : customer.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-ink-secondary">
                  {formatDate(customer.registeredAt)}
                </TableCell>
                <TableCell>
                  <HealthBadge score={customer.healthScore} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-tertiary">
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
