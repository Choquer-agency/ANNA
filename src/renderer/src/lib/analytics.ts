import posthog from 'posthog-js'

let initialized = false

export function initAnalytics(): void {
  const apiKey = process.env.POSTHOG_API_KEY
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!apiKey) {
    console.warn('[analytics] POSTHOG_API_KEY not set, analytics disabled')
    return
  }

  posthog.init(apiKey, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    persistence: 'localStorage'
  })

  initialized = true
}

export function setSuperProperties(props: Record<string, string>): void {
  if (!initialized) return
  posthog.register(props)
}

export function identify(distinctId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.identify(distinctId, traits)
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function reset(): void {
  if (!initialized) return
  posthog.reset()
}

export function optOut(): void {
  if (!initialized) return
  posthog.opt_out_capturing()
}

export function optIn(): void {
  if (!initialized) return
  posthog.opt_in_capturing()
}
