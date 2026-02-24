'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')

  // Redirect once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn('password', { email, password, flow: mode })
      // Auth state change will trigger the useEffect redirect above
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      <div className="w-full max-w-sm bg-surface rounded-lg border border-border p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Anna Admin</h1>
          <p className="text-ink-secondary mt-2 text-sm">
            {mode === 'signIn' ? 'Sign in to your admin account' : 'Create your admin account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-md text-sm bg-surface focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder={mode === 'signUp' ? 'Create password (8+ chars)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signUp' ? 8 : undefined}
            className="w-full px-3 py-2.5 border border-border rounded-md text-sm bg-surface focus:outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError('') }}
            className="text-xs text-ink-tertiary hover:text-primary"
          >
            {mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
