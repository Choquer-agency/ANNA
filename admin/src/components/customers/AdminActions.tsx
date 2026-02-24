'use client'

import { useState } from 'react'
import { useMutation, useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Gift, Clock, RotateCcw, CreditCard, XCircle, AlertTriangle } from 'lucide-react'

interface AdminActionsProps {
  userId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  planId?: string
}

type ActionType = 'gift30' | 'gift365' | 'extend' | 'resetWords' | 'refund' | 'cancel' | 'cancelNow' | null

export function AdminActions({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  planId,
}: AdminActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [extendDays, setExtendDays] = useState(30)
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const giftPro = useMutation(api.adminMutations.giftPro)
  const extendSub = useMutation(api.adminMutations.extendSubscription)
  const resetWords = useMutation(api.adminMutations.resetWordCount)
  const cancelSub = useAction(api.adminActions.cancelSubscription)
  const cancelNow = useAction(api.adminActions.cancelSubscriptionImmediately)
  const refund = useAction(api.adminActions.issueRefund)

  const executeAction = async () => {
    setIsExecuting(true)
    setResult(null)
    try {
      switch (activeAction) {
        case 'gift30':
          await giftPro({ userId, durationDays: 30 })
          setResult('Gifted 30 days of Pro')
          break
        case 'gift365':
          await giftPro({ userId, durationDays: 365 })
          setResult('Gifted 1 year of Pro')
          break
        case 'extend':
          await extendSub({ userId, days: extendDays })
          setResult(`Extended subscription by ${extendDays} days`)
          break
        case 'resetWords':
          await resetWords({ userId })
          setResult('Word count reset to 0')
          break
        case 'refund':
          if (!stripeCustomerId) throw new Error('No Stripe customer ID')
          const r = await refund({ stripeCustomerId })
          setResult(`Refund issued: $${((r.amountCents ?? 0) / 100).toFixed(2)}`)
          break
        case 'cancel':
          if (!stripeSubscriptionId) throw new Error('No Stripe subscription ID')
          await cancelSub({ stripeSubscriptionId })
          setResult('Subscription set to cancel at period end')
          break
        case 'cancelNow':
          if (!stripeSubscriptionId) throw new Error('No Stripe subscription ID')
          await cancelNow({ stripeSubscriptionId })
          setResult('Subscription cancelled immediately')
          break
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setIsExecuting(false)
      setTimeout(() => {
        setActiveAction(null)
        setResult(null)
      }, 2000)
    }
  }

  const actionConfig: Record<string, { title: string; description: string; destructive?: boolean }> = {
    gift30: { title: 'Gift 30 Days Pro', description: 'Grant this user 30 days of Pro access at no charge.' },
    gift365: { title: 'Gift 1 Year Pro', description: 'Grant this user 1 year of Pro access at no charge.' },
    extend: { title: 'Extend Subscription', description: `Add ${extendDays} days to the current subscription period.` },
    resetWords: { title: 'Reset Word Count', description: 'Reset this user\'s weekly word count to 0. Use for support cases.' },
    refund: { title: 'Issue Refund', description: 'Refund the last payment for this customer via Stripe.', destructive: true },
    cancel: { title: 'Cancel at Period End', description: 'Cancel the subscription at the end of the current billing period.', destructive: true },
    cancelNow: { title: 'Cancel Immediately', description: 'Cancel the subscription and revoke access immediately. This cannot be undone.', destructive: true },
  }

  const config = activeAction ? actionConfig[activeAction] : null

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink-secondary">Admin Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveAction('gift30')}>
            <Gift className="w-3.5 h-3.5 mr-1.5" />
            Gift 30d
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveAction('gift365')}>
            <Gift className="w-3.5 h-3.5 mr-1.5" />
            Gift 1yr
          </Button>
          {planId !== 'free' && (
            <Button variant="outline" size="sm" onClick={() => setActiveAction('extend')}>
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Extend
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setActiveAction('resetWords')}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Words
          </Button>
          {stripeCustomerId && (
            <Button variant="outline" size="sm" className="text-danger border-danger hover:bg-danger-light" onClick={() => setActiveAction('refund')}>
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Refund
            </Button>
          )}
          {stripeSubscriptionId && (
            <>
              <Button variant="outline" size="sm" className="text-danger border-danger hover:bg-danger-light" onClick={() => setActiveAction('cancel')}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="text-danger border-danger hover:bg-danger-light" onClick={() => setActiveAction('cancelNow')}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Cancel Now
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={activeAction !== null} onOpenChange={() => { setActiveAction(null); setResult(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config?.title}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>

          {activeAction === 'extend' && (
            <div className="py-2">
              <label className="text-sm text-ink-secondary">Days to add:</label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm"
                min={1}
                max={365}
              />
            </div>
          )}

          {result && (
            <p className={`text-sm ${result.startsWith('Error') ? 'text-danger' : 'text-success'}`}>
              {result}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActiveAction(null); setResult(null) }}>
              Cancel
            </Button>
            <Button
              variant={config?.destructive ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={isExecuting || !!result}
            >
              {isExecuting ? 'Executing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
