import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'calculate user health scores',
  { hours: 6 },
  internal.adminHealth.calculateHealthScores
)

export default crons
