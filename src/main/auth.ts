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
