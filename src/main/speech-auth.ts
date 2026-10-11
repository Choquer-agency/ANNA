import { app } from 'electron'
import { anyApi } from 'convex/server'
import { ensureClient } from './convex'
import { isAuthenticated } from './auth'

export function hasDeepgramAccess(): boolean {
  return (!app.isPackaged && !!process.env.DEEPGRAM_API_KEY) || (!!process.env.CONVEX_URL && isAuthenticated())
}

export async function deepgramAuthorization(): Promise<string> {
  // Direct keys are development-only. Published apps receive short-lived tokens.
  if (!app.isPackaged && process.env.DEEPGRAM_API_KEY) return `Token ${process.env.DEEPGRAM_API_KEY}`
  if (!isAuthenticated()) throw new Error('Sign in to Anna to use cloud dictation.')
  const result = await ensureClient().action(anyApi.speech.deepgramToken, {})
  if (!result?.token) throw new Error('Could not authorize cloud dictation. Please sign in again.')
  return `Bearer ${result.token}`
}
