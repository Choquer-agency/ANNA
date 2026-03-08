'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'
import type { Id } from '@convex/_generated/dataModel'
import { useState } from 'react'

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function CorrectionsPage() {
  const recommendations = useQuery(api.corrections.getVocabularyRecommendations, {})
  const corrections = useQuery(api.corrections.listForReview, { limit: 50 })
  const approve = useMutation(api.corrections.approveRecommendation)
  const deny = useMutation(api.corrections.denyRecommendation)
  const generateRecs = useMutation(api.corrections.generateRecommendations)

  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending')

  const loading = !recommendations

  const filtered = recommendations?.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  }) ?? []

  const pending = recommendations?.filter((r) => r.status === 'pending') ?? []
  const highPriority = pending.filter((r) => r.priority === 'high')
  const totalCorrections = corrections?.length ?? 0

  async function handleGenerate() {
    setGenerating(true)
    try {
      await generateRecs({})
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Corrections & Vocabulary</h2>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant="outline"
          size="sm"
        >
          {generating ? 'Generating...' : 'Generate Recommendations'}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Corrections"
          value={String(totalCorrections)}
          loading={!corrections}
        />
        <MetricCard
          label="Pending Reviews"
          value={String(pending.length)}
          loading={loading}
        />
        <MetricCard
          label="High Priority"
          value={String(highPriority.length)}
          loading={loading}
        />
        <MetricCard
          label="Total Recommendations"
          value={String(recommendations?.length ?? 0)}
          loading={loading}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'denied', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-ink-secondary hover:bg-surface-hover'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Recommendations table */}
      <Card>
        <CardContent className="pt-6">
          {filtered.length > 0 ? (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[80px_1fr_100px_100px_120px] gap-4 px-3 py-2 text-xs font-medium text-ink-tertiary uppercase tracking-wider border-b border-border">
                <div>Priority</div>
                <div>Original &rarr; Corrected</div>
                <div className="text-center">Occurrences</div>
                <div className="text-center">Status</div>
                <div className="text-right">Action</div>
              </div>

              {/* Rows */}
              {filtered.map((rec) => (
                <div
                  key={rec._id}
                  className="grid grid-cols-[80px_1fr_100px_100px_120px] gap-4 items-center px-3 py-3 rounded-md hover:bg-surface-hover transition-colors"
                >
                  <Badge
                    className={`text-xs ${PRIORITY_COLORS[rec.priority] ?? ''}`}
                    variant="outline"
                  >
                    {rec.priority}
                  </Badge>

                  <div className="text-sm">
                    <span className="text-ink-secondary line-through">{rec.originalWord}</span>
                    <span className="text-ink-tertiary mx-2">&rarr;</span>
                    <span className="text-ink font-medium">{rec.correctedWord}</span>
                  </div>

                  <div className="text-center text-sm text-ink-secondary">
                    {rec.occurrences}
                  </div>

                  <div className="text-center">
                    <Badge variant={rec.status === 'approved' ? 'default' : rec.status === 'denied' ? 'destructive' : 'secondary'} className="text-xs">
                      {rec.status}
                    </Badge>
                  </div>

                  <div className="flex gap-1 justify-end">
                    {rec.status === 'pending' && (
                      <>
                        <Button
                          size="xs"
                          variant="default"
                          onClick={() => approve({ id: rec._id as Id<'vocabularyRecommendations'> })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => deny({ id: rec._id as Id<'vocabularyRecommendations'> })}
                        >
                          Deny
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-ink-tertiary text-sm">
              {loading ? 'Loading...' : 'No recommendations found. Try generating from corrections.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent corrections */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-ink-secondary mb-4">Recent Corrections</h3>
          {corrections && corrections.length > 0 ? (
            <div className="space-y-2">
              {corrections.slice(0, 20).map((c) => (
                <div key={c._id} className="flex items-start justify-between py-2 px-2 rounded-md hover:bg-surface-hover text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-secondary text-xs mb-1 truncate">
                      {c.appName ?? 'Unknown app'} &middot; {c.capturedAt}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-ink-tertiary mb-0.5">Original</p>
                        <p className="text-ink line-clamp-2">{c.originalText.slice(0, 200)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-tertiary mb-0.5">Corrected</p>
                        <p className="text-ink line-clamp-2">{c.correctedText.slice(0, 200)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-tertiary text-sm">
              No corrections captured yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
