import { getSetting, setSetting } from './db'
import { ConvexHttpClient } from 'convex/browser'

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'

export function getStoredToken(): string | null {
  return getSetting(TOKEN_KEY) ?? null
}

export function getStoredRefreshToken(): string | null {
  return getSetting(REFRESH_TOKEN_KEY) ?? null
}

export function storeAuthTokens(token: string, refreshToken?: string): void {
  setSetting(TOKEN_KEY, token)
  if (refreshToken) {
    setSetting(REFRESH_TOKEN_KEY, refreshToken)
  }
  console.log('[auth] Tokens stored')
}

export function clearAuthTokens(): void {
  setSetting(TOKEN_KEY, '')
  setSetting(REFRESH_TOKEN_KEY, '')
  console.log('[auth] Tokens cleared')
}

export function isAuthenticated(): boolean {
  const token = getStoredToken()
  return !!token && token.length > 0
}

/** Check if the stored JWT token is expired */
export function isTokenExpired(): boolean {
  const token = getStoredToken()
  if (!token) return true
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    // Consider expired if within 5 minutes of expiry
    return payload.exp * 1000 < Date.now() + 5 * 60 * 1000
  } catch {
    return true
  }
}

export function applyAuthToClient(client: ConvexHttpClient): void {
  const token = getStoredToken()
  if (token) {
    client.setAuth(token)
  }
}

const AUTH_USER_ID_KEY = 'convex_auth_user_id'

/**
 * Extract the userId from the locally stored JWT (the part of `sub` before `|`).
 * Does NOT validate signature or expiry — this is just an identity hint we can
 * pass as `args.userId` to mutations. Server still prefers its own auth check;
 * this only matters when that check silently fails (e.g. after a Convex
 * deployment/team migration that invalidates outstanding tokens).
 */
export function getUserIdFromToken(): string | null {
  const token = getStoredToken()
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const sub = String(payload?.sub ?? '')
    const userId = sub.split('|')[0]
    return userId || null
  } catch {
    return null
  }
}

/**
 * Stable userId for sync mutations. Prefers the JWT `sub`, falls back to a
 * previously-cached value, finally falls back to the legacy random UUID.
 * Always returns a non-empty string so sync mutations never have to guess.
 */
export function getEffectiveUserId(): string {
  const fromToken = getUserIdFromToken()
  if (fromToken) {
    if (getSetting(AUTH_USER_ID_KEY) !== fromToken) {
      setSetting(AUTH_USER_ID_KEY, fromToken)
    }
    return fromToken
  }
  const cached = getSetting(AUTH_USER_ID_KEY)
  if (cached) return cached
  let legacy = getSetting('convex_user_id')
  if (!legacy) {
    const { randomUUID } = require('crypto')
    legacy = randomUUID()
    setSetting('convex_user_id', legacy!)
  }
  return legacy!
}
