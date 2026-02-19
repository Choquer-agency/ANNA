'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '@convex/_generated/api'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { NameStep } from './NameStep'
import { PlanStep } from './PlanStep'
import { DownloadStep } from './DownloadStep'
import { ease } from '@/lib/animations'

const STEPS = ['name', 'plan', 'download'] as const
type Step = (typeof STEPS)[number]

export function OnboardingFlow() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const registration = useQuery(api.registrations.getRegistration)
  const registerMutation = useMutation(api.registrations.register)

  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('free')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // If already registered, skip to dashboard
  useEffect(() => {
    if (registration) {
      router.push('/dashboard')
    }
  }, [registration, router])

  // Pre-fill from registration if available
  useEffect(() => {
    if (registration) {
      setName(registration.name || '')
      setEmail(registration.email || '')
    }
  }, [registration])

  const currentStepIndex = STEPS.indexOf(step)

  const handleComplete = async () => {
    try {
      await registerMutation({
        name: name.trim(),
        email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
        consentedAt: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        platform: 'web',
        selectedPlan,
      })
    } catch {
      // Registration may already exist, continue anyway
    }
    router.push('/dashboard')
  }

  if (isLoading || !isAuthenticated || registration === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    )
  }

  // Already registered — redirect handled by useEffect, show loading
  if (registration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — gradient panel matching auth pages */}
      <div className="hidden lg:block w-[50%] p-5 pr-0">
        <div className="relative h-full rounded-[24px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, #f5ede4 0%, #f0ddd0 25%, #edc8a8 50%, #e8b890 70%, #f0ddd0 100%)',
            }}
          />
          <div className="absolute inset-0">
            <div className="absolute w-[500px] h-[500px] top-[20%] left-[30%] rounded-full bg-[#e8a060]/40 blur-[100px]" />
            <div className="absolute w-[300px] h-[300px] top-[40%] left-[10%] rounded-full bg-[#d4956a]/30 blur-[80px]" />
            <div className="absolute w-[400px] h-[400px] bottom-[10%] right-[10%] rounded-full bg-[#f0c8a0]/30 blur-[90px]" />
          </div>

          <div className="relative flex flex-col justify-between h-full p-10">
            <a href="/">
              <AnnaLogo className="h-5 text-ink" />
            </a>

            <div className="max-w-[380px] pb-4">
              <p className="text-sm font-medium text-ink-muted/70 mb-3">Almost there</p>
              <h2 className="text-[2rem] leading-[1.2] font-semibold text-ink tracking-[-0.02em]">
                Let&apos;s set up your
                <br />
                Anna account.
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Right — onboarding steps */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Progress dots */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="flex items-center gap-2 mb-10"
          >
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentStepIndex
                    ? 'bg-primary w-8'
                    : 'bg-border w-4'
                }`}
              />
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 'name' && (
              <NameStep
                key="name"
                name={name}
                onNameChange={setName}
                onContinue={() => setStep('plan')}
              />
            )}
            {step === 'plan' && (
              <PlanStep
                key="plan"
                selectedPlan={selectedPlan}
                onPlanChange={setSelectedPlan}
                onContinue={() => setStep('download')}
              />
            )}
            {step === 'download' && (
              <DownloadStep
                key="download"
                onComplete={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
