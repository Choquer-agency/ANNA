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

export function applyAuthToClient(client: ConvexHttpClient): void {
  const token = getStoredToken()
  if (token) {
    client.setAuth(token)
  }
}
