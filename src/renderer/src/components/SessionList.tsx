import type { Session } from '../types'
import { SessionRow } from './SessionRow'
import { FirstDictationGuide } from './FirstDictationGuide'

interface SessionListProps {
  sessions: Session[]
  retryingSessionId: string | null
  onCopy: (text: string) => void
  onRetry: (id: string, customPrompt?: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
  onFlag: (id: string) => void
  hotkey?: string
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / 86400000)
  if (diffDays === 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function groupByDate(sessions: Session[]): [string, Session[]][] {
  const groups: Map<string, Session[]> = new Map()
  for (const session of sessions) {
    const label = getDateLabel(session.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(session)
  }
  return Array.from(groups.entries())
}

export function SessionList({
  sessions,
  retryingSessionId,
  onCopy,
  onRetry,
  onDownload,
  onDelete,
  onFlag,
  hotkey = 'Ctrl+Space'
}: SessionListProps): React.JSX.Element {
  if (sessions.length === 0) {
    return <FirstDictationGuide hotkey={hotkey} />
  }

  const groups = groupByDate(sessions)

  return (
    <>
      {groups.map(([label, groupSessions]) => (
        <div key={label} className="mb-6">
          <h3 className="text-xs font-bold text-ink-faint tracking-wider mb-2 px-3">
            {label}
          </h3>
          <div>
            {groupSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isRetrying={retryingSessionId === session.id}
                onCopy={onCopy}
                onRetry={onRetry}
                onDownload={onDownload}
                onDelete={onDelete}
                onFlag={onFlag}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
