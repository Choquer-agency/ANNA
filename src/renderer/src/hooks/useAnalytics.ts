import { useCallback } from 'react'
import { track } from '../lib/analytics'

export function useAnalytics() {
  const trackEvent = useCallback((event: string, properties?: Record<string, unknown>) => {
    track(event, properties)
  }, [])

  return { track: trackEvent }
}
