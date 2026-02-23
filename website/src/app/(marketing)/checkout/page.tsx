'use client'

import { useEffect, useRef, useState } from 'react'

export default function CheckoutPage() {
  const triggered = useRef(false)
  const [status, setStatus] = useState('Setting up your free trial...')

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true

    const pending = sessionStorage.getItem('pendingCheckout')
    if (!pending) {
      window.location.href = '/pricing'
      return
    }

    const { plan, interval, email } = JSON.parse(pending)
    sessionStorage.removeItem('pendingCheckout')

    setStatus('Redirecting to Stripe...')

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval, email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url
        } else {
          setStatus('Something went wrong. Redirecting...')
          setTimeout(() => { window.location.href = '/pricing' }, 2000)
        }
      })
      .catch(() => {
        setStatus('Something went wrong. Redirecting...')
        setTimeout(() => { window.location.href = '/pricing' }, 2000)
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-ink font-medium">{status}</p>
      </div>
    </div>
  )
}
