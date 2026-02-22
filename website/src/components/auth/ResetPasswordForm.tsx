'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

function AnnaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1092 966" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M374.666 96.1406L30.6471 658.222C-72.0646 826.071 101.623 1026.76 281.881 948.559L429.61 884.419C503.895 852.185 588.152 852.185 662.39 884.419L810.119 948.559C990.377 1026.81 1164.06 826.071 1061.35 658.222L717.38 96.1406C638.949 -32.0469 453.098 -32.0469 374.666 96.1406Z" fill="#FF9E19"/>
    </svg>
  )
}

export function ResetPasswordForm() {
  const { onMouseMove } = usePlasmaHover()
  const { signIn } = useAuthActions()
  const searchParams = useSearchParams()
  const isElectron = searchParams.get('electron_redirect') === 'true'

  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signIn('password', {
        email,
        flow: 'reset',
      })
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const redirectTo = isElectron ? '/electron-callback' : '/login'
      await signIn('password', {
        email,
        code,
        newPassword,
        flow: 'reset-verification',
        redirectTo,
      })
      // On success, redirect to login
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code or password reset failed.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
      >
        <AnnaIcon className="h-8 w-auto mb-8" />

        {step === 'request' ? (
          <>
            <h1 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">Reset your password</h1>
            <p className="text-[0.9rem] text-ink-muted mb-8">
              Enter your email and we&apos;ll send you a code to reset your password.
            </p>

            {error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                  Your email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                onMouseMove={onMouseMove}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group disabled:opacity-60 mt-2"
              >
                <span className="relative z-[2]">{loading ? 'Sending...' : 'Send reset code'}</span>
                {!loading && <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">Check your email</h1>
            <p className="text-[0.9rem] text-ink-muted mb-8">
              We sent a verification code to <span className="font-medium text-ink">{email}</span>. Enter it below with your new password.
            </p>

            {error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyReset} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-ink mb-1.5">
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                  placeholder="Enter the code from your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-ink mb-1.5">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                onMouseMove={onMouseMove}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group disabled:opacity-60 mt-2"
              >
                <span className="relative z-[2]">{loading ? 'Resetting...' : 'Reset password'}</span>
                {!loading && <Check className="relative z-[2] w-4 h-4" />}
              </button>
            </form>

            <button
              onClick={() => { setStep('request'); setError(null) }}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Try a different email
            </button>
          </>
        )}

        <p className="mt-8 text-center text-sm text-ink-muted">
          Remember your password?{' '}
          <a href={`/login${isElectron ? '?electron_redirect=true' : ''}`} className="text-primary font-semibold hover:underline transition-colors duration-300">
            Sign in
          </a>
        </p>
      </motion.div>
    </div>
  )
}
