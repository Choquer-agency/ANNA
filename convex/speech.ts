import { action, internalMutation } from './_generated/server'
import { anyApi } from 'convex/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

// Persistent, atomic throttling prevents clients from bypassing limits by reconnecting.
export const reserveGrant = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now = Date.now()
    const record = await ctx.db.query('speechTokenGrants').withIndex('by_user', q => q.eq('userId', userId)).unique()
    if (record && now - record.windowStart < 60_000 && record.count >= 30) throw new Error('Too many speech requests. Please wait a minute.')
    const fields = { userId, windowStart: record && now - record.windowStart < 60_000 ? record.windowStart : now, count: record && now - record.windowStart < 60_000 ? record.count + 1 : 1 }
    if (record) await ctx.db.patch(record._id, fields)
    else await ctx.db.insert('speechTokenGrants', fields)
  }
})

export const deepgramToken = action({
  args: {},
  handler: async (ctx): Promise<{ token: string; expiresIn: number }> => {
    const user = await getAuthUserId(ctx)
    if (!user) throw new Error('Sign in to Anna to use cloud dictation.')
    await ctx.runMutation(anyApi.speech.reserveGrant, { userId: String(user) })
    const key = process.env.DEEPGRAM_API_KEY
    if (!key) throw new Error('Cloud dictation is temporarily unavailable.')
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST', headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: 60 })
    })
    if (!response.ok) throw new Error(`Speech authorization failed (${response.status}). Please try again.`)
    const result = await response.json()
    if (typeof result.access_token !== 'string') throw new Error('Invalid speech authorization response')
    return { token: result.access_token, expiresIn: Number(result.expires_in) || 60 }
  }
})
