'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '@convex/_generated/api'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { NameStep } from './NameStep'
import { PlanStep } from './PlanStep'
import { DownloadStep } from './DownloadStep'
import { ease } from '@/lib/animations'

const ALL_STEPS = ['name', 'plan', 'download'] as const
const ELECTRON_STEPS = ['name', 'plan'] as const
type Step = (typeof ALL_STEPS)[number]

export function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isElectron = searchParams.get('electron_redirect') === 'true'
  const STEPS = isElectron ? ELECTRON_STEPS : ALL_STEPS
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

  // If already registered, skip to destination
  useEffect(() => {
    if (registration) {
      router.push(isElectron ? '/electron-callback' : '/dashboard')
    }
  }, [registration, router, isElectron])

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
    router.push(isElectron ? '/electron-callback' : '/dashboard')
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
      {/* Left — animated gradient panel matching auth pages */}
      <div className="hidden lg:block w-[50%] p-5 pr-0">
        <div className="relative h-full rounded-[24px] overflow-hidden bg-[#FFF8F0]">
          {/* Animated blobs */}
          <div className="absolute w-[500px] h-[500px] top-[-10%] left-[-5%] rounded-full bg-[#FF9E19]/50 blur-[100px]" style={{ animation: 'blob-drift-1 12s ease-in-out infinite' }} />
          <div className="absolute w-[400px] h-[400px] top-[5%] right-[-5%] rounded-full bg-[#EBC1FF]/60 blur-[90px]" style={{ animation: 'blob-drift-2 14s ease-in-out infinite' }} />
          <div className="absolute w-[450px] h-[450px] bottom-[20%] left-[20%] rounded-full bg-[#FFDBA6]/50 blur-[100px]" style={{ animation: 'blob-drift-3 16s ease-in-out infinite' }} />
          <div className="absolute w-[350px] h-[350px] bottom-[-5%] right-[10%] rounded-full bg-[#EBC1FF]/45 blur-[80px]" style={{ animation: 'blob-drift-4 13s ease-in-out infinite' }} />

          {/* Content */}
          <div className="relative flex flex-col justify-between h-full p-10">
            <a href="/">
              <AnnaLogo className="h-5 text-ink" />
            </a>

            <div className="max-w-[520px] pb-4">
              <p className="text-base font-medium text-ink-muted/70 mb-4">Almost there</p>
              <h2
                className="text-ink tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw + 0.5rem, 4.5rem)',
                  lineHeight: 1.05,
                  fontWeight: 500,
                }}
              >
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
                onContinue={isElectron ? handleComplete : () => setStep('download')}
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
