'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { FadeIn } from '@/components/ui/FadeIn'

// ── Mock user pool (63 unique headshots — never repeat) ──

const NAMES = [
  'Sarah K.', 'Emily R.', 'Jake T.', 'Priya M.', 'Aisha L.', 'Tomas G.', 'Lena W.',
  'Daniel P.', 'Rachel S.', 'Ben C.', 'Sofia H.', 'Andres V.', 'Marcus D.', 'Bryce Q.',
  'Olivia N.', 'Ethan B.', 'Maya J.', 'Lucas F.', 'Zoe A.', 'Noah R.', 'Isla M.',
  'Leo H.', 'Chloe T.', 'Kai S.', 'Ava P.', 'Finn D.', 'Mia L.', 'Oscar W.',
  'Luna G.', 'Felix K.', 'Ella V.', 'Max C.', 'Ruby N.', 'Sam B.', 'Iris J.',
  'Alex F.', 'Jade A.', 'Cole R.', 'Nina M.', 'Ryan H.', 'Clara S.', 'James W.',
  'Amara T.', 'Diego L.', 'Harper B.', 'Yuki N.', 'Sasha R.', 'Omar K.', 'Freya D.',
  'Mateo V.', 'Noor A.', 'Liam G.', 'Aria P.', 'Ravi M.', 'Zara H.', 'Theo C.',
  'Elise F.', 'Jordan Q.', 'Mika J.', 'Stella E.', 'Dante R.', 'Ivy L.', 'Rowan S.',
]

// Image filenames: Image.png, Image-2.png through Image-62.png
const HEADSHOT_FILES = [
  'Image.png',
  ...Array.from({ length: 62 }, (_, i) => `Image-${i + 2}.png`),
]

const MOCK_USERS = HEADSHOT_FILES.map((file, i) => ({
  id: i,
  name: NAMES[i % NAMES.length],
  avatar: `/images/headshots/${file}`,
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] shrink-0"
    >
      <Image
        src={user.avatar}
        alt={user.name}
        width={76}
        height={76}
        className="rounded-full ring-[3px] ring-white shadow-[0_4px_16px_rgba(0,0,0,0.1)] object-cover w-full h-full"
      />
      <SoundWaveBadge />
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

const VISIBLE_COUNT = 9

export function LiveUsersSection() {
  const [initialShuffle] = useState(() => shuffleArray(MOCK_USERS))
  const [visibleUsers, setVisibleUsers] = useState(() =>
    initialShuffle.slice(0, VISIBLE_COUNT)
  )
  const [pool, setPool] = useState(() =>
    initialShuffle.slice(VISIBLE_COUNT)
  )
  const [extraCount, setExtraCount] = useState(
    () => MOCK_USERS.length - VISIBLE_COUNT
  )

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

  // Fluctuate the "+X more" counter every 15-30 seconds
  useEffect(() => {
    const tick = () => {
      setExtraCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1
        const next = prev + delta * (Math.floor(Math.random() * 3) + 1)
        return Math.max(12, Math.min(45, next))
      })
    }
    const schedule = () => {
      const delay = 15000 + Math.random() * 15000
      return setTimeout(() => {
        tick()
        timerRef = schedule()
      }, delay)
    }
    let timerRef = schedule()
    return () => clearTimeout(timerRef)
  }, [])

  return (
    <section className="pt-8 pb-[clamp(2rem,4vw,4rem)] overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Heading */}
        <FadeIn>
          <div className="text-center mb-8">
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

        {/* Single row of 9 avatars */}
        <FadeIn delay={0.15}>
          <div className="flex items-center justify-center gap-5 sm:gap-6">
            <AnimatePresence mode="sync">
              {visibleUsers.map((user) => (
                <AvatarBubble key={user.id} user={user} />
              ))}
            </AnimatePresence>
          </div>
        </FadeIn>

        {/* Counter */}
        <FadeIn delay={0.3}>
          <p className="text-center mt-8 text-ink-muted text-sm">
            <motion.span
              key={extraCount}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              +{extraCount}
            </motion.span>
            {' '}more using Anna right now
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
