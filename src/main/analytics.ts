import { PostHog } from 'posthog-node'
import { getSetting } from './db'

let posthog: PostHog | null = null

export function getPostHog(): PostHog | null {
  if (!posthog) {
    const apiKey = process.env.POSTHOG_API_KEY
    if (!apiKey) return null

    posthog = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 5,
      flushInterval: 10000
    })
  }
  return posthog
}

export function trackMainEvent(event: string, properties?: Record<string, unknown>): void {
  const analyticsEnabled = getSetting('analytics_enabled')
  if (analyticsEnabled === 'false') return

  const ph = getPostHog()
  if (!ph) return

  const distinctId = getSetting('device_id') || 'anonymous'

  ph.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: 'posthog-node'
    }
  })
}

export async function shutdownPostHog(): Promise<void> {
  if (posthog) {
    await posthog.shutdown()
    posthog = null
  }
}
