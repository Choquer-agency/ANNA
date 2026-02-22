'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { FadeIn } from '@/components/ui/FadeIn'

// ── Mock user pool (40 users, cycling 14 avatars) ──

const AVATARS = [
  'sarah', 'emily', 'jake', 'priya', 'aisha', 'tomas', 'lena',
  'daniel', 'rachel', 'ben', 'sofia', 'andres', 'marcus', 'bryce',
]

const MOCK_USERS = [
  'Sarah K.', 'Emily R.', 'Jake T.', 'Priya M.', 'Aisha L.', 'Tomas G.', 'Lena W.',
  'Daniel P.', 'Rachel S.', 'Ben C.', 'Sofia H.', 'Andres V.', 'Marcus D.', 'Bryce Q.',
  'Olivia N.', 'Ethan B.', 'Maya J.', 'Lucas F.', 'Zoe A.', 'Noah R.', 'Isla M.',
  'Leo H.', 'Chloe T.', 'Kai S.', 'Ava P.', 'Finn D.', 'Mia L.', 'Oscar W.',
  'Luna G.', 'Felix K.', 'Ella V.', 'Max C.', 'Ruby N.', 'Sam B.', 'Iris J.',
  'Alex F.', 'Jade A.', 'Cole R.', 'Nina M.', 'Ryan H.',
].map((name, i) => ({
  id: i,
  name,
  avatar: `/images/avatars/${AVATARS[i % AVATARS.length]}.jpg`,
}))

const WAVE_GRADIENT =
  'linear-gradient(to bottom, #FF6B9D 0%, rgba(255,255,255,0.85) 24%, rgba(255,255,255,0.85) 76%, #FF9E19 100%)'

// Heights for 4 bars — varied so they pulse at different amplitudes
const BAR_CONFIGS = [
  { height: '55%', duration: '0.8s', delay: '0s' },
  { height: '85%', duration: '0.65s', delay: '0.1s' },
  { height: '75%', duration: '0.75s', delay: '0.2s' },
  { height: '50%', duration: '0.85s', delay: '0.05s' },
]

function SoundWaveBadge() {
  return (
    <div className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-surface-dark shadow-md">
      <div className="flex items-end gap-[2px] h-[14px]">
        {BAR_CONFIGS.map((bar, i) => (
          <div
            key={i}
            className="w-[2.5px] rounded-full"
            style={{
              background: WAVE_GRADIENT,
              animation: `waveform-pulse ${bar.duration} ease-in-out ${bar.delay} infinite`,
              // @ts-expect-error CSS custom property
              '--wave-height': bar.height,
              minHeight: '3px',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function AvatarBubble({ user }: { user: (typeof MOCK_USERS)[0] }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative"
    >
      <div className="relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px]">
        <Image
          src={user.avatar}
          alt={user.name}
          width={76}
          height={76}
          className="rounded-full ring-[3px] ring-white shadow-[0_4px_16px_rgba(0,0,0,0.1)] object-cover w-full h-full"
        />
        <SoundWaveBadge />
      </div>
    </motion.div>
  )
}

// ── Shuffle helper ──

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ── Section ──

export function LiveUsersSection() {
  const VISIBLE_COUNT_DESKTOP = 14
  const VISIBLE_COUNT_MOBILE = 8

  const [visibleCount, setVisibleCount] = useState(VISIBLE_COUNT_DESKTOP)
  const [visibleUsers, setVisibleUsers] = useState(() =>
    shuffleArray(MOCK_USERS).slice(0, VISIBLE_COUNT_DESKTOP)
  )
  const [pool, setPool] = useState(() => {
    const initial = shuffleArray(MOCK_USERS).slice(0, VISIBLE_COUNT_DESKTOP)
    const ids = new Set(initial.map((u) => u.id))
    return MOCK_USERS.filter((u) => !ids.has(u.id))
  })

  // Responsive: detect mobile
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setVisibleCount(e.matches ? VISIBLE_COUNT_DESKTOP : VISIBLE_COUNT_MOBILE)
    }
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Trim visible list if screen shrinks
  useEffect(() => {
    setVisibleUsers((prev) => {
      if (prev.length > visibleCount) {
        const removed = prev.slice(visibleCount)
        setPool((p) => [...p, ...removed])
        return prev.slice(0, visibleCount)
      }
      return prev
    })
  }, [visibleCount])

  // Rotate one user every 2-4 seconds
  const rotateUser = useCallback(() => {
    setVisibleUsers((prev) => {
      if (pool.length === 0) return prev

      const swapIndex = Math.floor(Math.random() * prev.length)
      const outgoing = prev[swapIndex]
      const incoming = pool[0]

      setPool((p) => [...p.slice(1), outgoing])

      const next = [...prev]
      next[swapIndex] = incoming
      return next
    })
  }, [pool])

  useEffect(() => {
    const interval = setInterval(rotateUser, 2500 + Math.random() * 1500)
    return () => clearInterval(interval)
  }, [rotateUser])

  const remainingCount = MOCK_USERS.length - visibleUsers.length

  return (
    <section className="section-py-sm overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Heading */}
        <FadeIn>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium">
                Live right now
              </p>
            </div>
            <h2 className="heading-md text-ink">
              People using Anna right now
            </h2>
          </div>
        </FadeIn>

        {/* Avatar grid */}
        <FadeIn delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 max-w-[700px] mx-auto">
            <AnimatePresence mode="popLayout">
              {visibleUsers.map((user) => (
                <AvatarBubble key={user.id} user={user} />
              ))}
            </AnimatePresence>
          </div>
        </FadeIn>

        {/* Counter */}
        {remainingCount > 0 && (
          <FadeIn delay={0.3}>
            <p className="text-center mt-8 text-ink-muted text-sm">
              +{remainingCount} more using Anna right now
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  )
}
