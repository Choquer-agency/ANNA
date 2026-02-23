import { QueryCtx } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Verify the caller is an authorized admin. Returns admin email and role.
 * Throws if not authenticated or not in the admin_users allowlist.
 */
export async function assertAdmin(ctx: QueryCtx): Promise<{ email: string; role: string }> {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Not authenticated')

  const user = await ctx.db.get(userId)
  if (!user?.email) throw new Error('No email found for user')

  const email = user.email as string
  const admin = await ctx.db
    .query('admin_users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first()

  if (!admin) throw new Error('Not authorized — email not in admin allowlist')

  return { email, role: admin.role }
}

/**
 * Verify the caller is an admin with 'owner' role.
 * Owners can perform destructive actions (refunds, cancellations, etc.).
 */
export async function assertOwner(ctx: QueryCtx): Promise<{ email: string }> {
  const { email, role } = await assertAdmin(ctx)
  if (role !== 'owner') {
    throw new Error('Owner role required for this action')
  }
  return { email }
}
