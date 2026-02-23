/**
 * Period calculation helpers for weekly word usage tracking.
 * All calculations use UTC to avoid timezone issues.
 */

/** Returns the ISO date string (YYYY-MM-DD) of the most recent Monday at 00:00 UTC. */
export function getCurrentPeriodStart(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = day === 0 ? 6 : day - 1 // days since last Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

/** Returns the ISO date string (YYYY-MM-DD) of the Sunday ending the current period. */
export function getCurrentPeriodEnd(): string {
  const start = new Date(getCurrentPeriodStart() + 'T00:00:00Z')
  const sunday = new Date(start)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  return sunday.toISOString().split('T')[0]
}

/** Returns the ISO datetime string of the next Monday at 00:00 UTC (when the period resets). */
export function getNextResetAt(): string {
  const start = new Date(getCurrentPeriodStart() + 'T00:00:00Z')
  const nextMonday = new Date(start)
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7)
  return nextMonday.toISOString()
}
