'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { CustomerTable } from '@/components/customers/CustomerTable'

export default function CustomersPage() {
  const customers = useQuery(api.adminQueries.listAllCustomers)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Customers</h2>
      <CustomerTable customers={customers ?? []} loading={!customers} />
    </div>
  )
}
