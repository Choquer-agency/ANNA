'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

const typewriterWords = [
  'Gmail',
  'Slack',
  'Notion',
  'emails',
  'notes',
  'Cursor',
  'code',
  'Discord',
  'docs',
  'Linear',
]

const allAvatars = [
  '/images/avatars/sarah.jpg',
  '/images/avatars/emily.jpg',
  '/images/avatars/jake.jpg',
  '/images/avatars/priya.jpg',
  '/images/avatars/aisha.jpg',
  '/images/avatars/tomas.jpg',
  '/images/avatars/lena.jpg',
  '/images/avatars/daniel.jpg',
  '/images/avatars/rachel.jpg',
  '/images/avatars/ben.jpg',
  '/images/avatars/sofia.jpg',
]

// Seed-based pseudo-random from the current date — same value all day, changes at midnight
function dailySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getDailyJoinCount() {
  return Math.floor(seededRandom(dailySeed()) * (1000 - 300 + 1)) + 300
}

function getDailyAvatars() {
  const seed = dailySeed()
  const shuffled = [...allAvatars]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 5)
}

function Typewriter() {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = typewriterWords[wordIndex]

    if (!isDeleting) {
      if (displayed.length < currentWord.length) {
        const timer = setTimeout(() => {
          setDisplayed(currentWord.slice(0, displayed.length + 1))
        }, 80)
        return () => clearTimeout(timer)
      }
      const timer = setTimeout(() => setIsDeleting(true), 1800)
      return () => clearTimeout(timer)
    }

    if (displayed.length > 0) {
      const timer = setTimeout(() => {
        setDisplayed(displayed.slice(0, -1))
      }, 50)
      return () => clearTimeout(timer)
    }

    setIsDeleting(false)
    setWordIndex((prev) => (prev + 1) % typewriterWords.length)
  }, [displayed, isDeleting, wordIndex])

  return (
    <span className="text-primary">
      {displayed}
      <span className="inline-block w-[3px] h-[0.85em] bg-primary/70 ml-0.5 align-middle animate-[blink_1s_step-end_infinite]" />
    </span>
  )
}

export function HeroSection() {
  const { onMouseMove } = usePlasmaHover()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const textY = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <section ref={containerRef} className="relative min-h-screen bg-mesh overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-[clamp(7rem,13vh,10.5rem)] pb-[clamp(4rem,8vh,8rem)]">
        <motion.div style={{ y: textY }} className="text-center">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0 }}
            className="mb-8 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-2 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Now available for macOS
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className="hero-heading text-ink mx-auto max-w-[900px]"
          >
            Your voice, perfectly
            <br className="hidden md:block" />
            typed into{' '}
            <Typewriter />
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
            className="mt-8 body-lg text-ink-muted max-w-[520px] mx-auto"
          >
            AI-powered voice dictation for macOS. Press a shortcut, speak
            naturally, and watch polished text appear anywhere you can type.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            <a
              href="/signup"
              className="inline-flex items-center gap-2.5 bg-primary text-white px-8 py-4 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_24px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 group"
            >
              Download for Mac
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <div className="flex -space-x-2.5">
              {getDailyAvatars().map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-surface"
                />
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{getDailyJoinCount().toLocaleString()}</span> people joined today
            </p>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
