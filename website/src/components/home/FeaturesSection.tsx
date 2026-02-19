'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from '@/components/ui/FadeIn'
import { useEffect, useRef, useState } from 'react'

/* ─── Pill badge ─── */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-primary-soft text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
      {children}
    </span>
  )
}

/* ─── Card wrapper ─── */
function Card({
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode
  className?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      className={`bg-surface-alt rounded-[20px] p-8 overflow-hidden transition-all duration-500 hover:shadow-medium hover:-translate-y-1 ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   1. AI Transcription — Hero card
   ════════════════════════════════════════════════════════ */
// Deterministic pseudo-random values for waveform bars (avoids hydration mismatch)
const waveformBars = Array.from({ length: 32 }).map((_, i) => ({
  height: 30 + ((i * 37 + 13) % 60),          // 30-89%
  duration: 0.8 + ((i * 53 + 7) % 80) / 100,  // 0.8-1.6s
}))

function AITranscriptionCard() {
  const sentence = 'The quick brown fox jumped over the lazy dog near the riverbank.'
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCharCount((c) => {
        if (c >= sentence.length) {
          setTimeout(() => setCharCount(0), 2000)
          return c
        }
        return c + 1
      })
    }, 60)
    return () => clearInterval(interval)
  }, [sentence.length])

  return (
    <Card className="col-span-1 md:col-span-2 row-span-1 lg:row-span-2 flex flex-col">
      <Badge>AI Transcription</Badge>
      {/* Waveform bars */}
      <div className="flex items-end justify-center gap-[3px] h-28 mb-6">
        {waveformBars.map((bar, i) => (
          <div
            key={i}
            className="w-[5px] rounded-full bg-primary/80"
            style={{
              ['--wave-height' as string]: `${bar.height}%`,
              animation: `waveform-pulse ${bar.duration}s ease-in-out ${i * 0.05}s infinite`,
              height: '20%',
            }}
          />
        ))}
      </div>
      {/* Typing text */}
      <div className="flex-1 flex items-start">
        <p className="body-md text-ink font-medium">
          {sentence.slice(0, charCount)}
          <span
            className="inline-block w-[2px] h-[1.1em] bg-primary ml-[2px] align-text-bottom"
            style={{ animation: 'blink-cursor 1s step-end infinite' }}
          />
        </p>
      </div>
      <p className="text-ink-muted body-md mt-4">
        Real-time speech to text, powered by local AI.
      </p>
    </Card>
  )
}

/* ════════════════════════════════════════════════════════
   2. Smart Formatting
   ════════════════════════════════════════════════════════ */
function SmartFormattingCard() {
  const [isFormatted, setIsFormatted] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setIsFormatted((f) => !f), 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <Badge>Smart Formatting</Badge>
      <div className="relative h-24 flex items-center">
        <AnimatePresence mode="wait">
          {!isFormatted ? (
            <motion.p
              key="raw"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-ink-muted text-sm font-mono leading-relaxed"
            >
              hey can you send me the report by friday thanks
            </motion.p>
          ) : (
            <motion.p
              key="formatted"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-ink text-sm font-medium leading-relaxed"
            >
              Hey, can you send me the report by Friday? Thanks.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <p className="text-ink-muted body-md mt-2">
        Auto-punctuates and capitalizes your speech.
      </p>
    </Card>
  )
}

/* ════════════════════════════════════════════════════════
   3. Style Profiles
   ════════════════════════════════════════════════════════ */
const profiles = [
  { label: 'Email', text: '"Hi Sarah, I wanted to follow up on our conversation regarding the Q4 budget."' },
  { label: 'Slack', text: '"hey! just pushed the fix, lmk if it works on your end 🙌"' },
  { label: 'Code', text: '"// TODO: Refactor auth middleware to support OAuth2 token refresh"' },
  { label: 'Notes', text: '"Key takeaway: reduce onboarding friction → improve day-1 retention"' },
]

function StyleProfilesCard() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setActive((a) => (a + 1) % profiles.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [paused])

  return (
    <Card
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Badge>Style Profiles</Badge>
      {/* Profile pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {profiles.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setActive(i)}
            className="relative px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-300"
          >
            {active === i && (
              <motion.div
                layoutId="profile-highlight"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${active === i ? 'text-white' : 'text-ink-muted'}`}>
              {p.label}
            </span>
          </button>
        ))}
      </div>
      {/* Sample text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-ink-secondary leading-relaxed italic"
        >
          {profiles[active].text}
        </motion.p>
      </AnimatePresence>
      <p className="text-ink-muted body-md mt-4">
        Adapt your tone for every context.
      </p>
    </Card>
  )
}

/* ════════════════════════════════════════════════════════
   5. Privacy First — Progress ring card
   ════════════════════════════════════════════════════════ */
function PrivacyFirstCard() {
  const [inView, setInView] = useState(false)
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const circumference = 2 * Math.PI * 54 // r=54

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Count-up animation
  useEffect(() => {
    if (!inView) return
    const duration = 2000
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(progress * 100))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView])

  return (
    <Card className="col-span-1 md:col-span-2">
      <Badge>Privacy First</Badge>
      <div ref={ref} className="flex items-center gap-6 my-2">
        {/* SVG Ring */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={inView ? 0 : circumference}
              style={{
                ['--ring-circumference' as string]: circumference,
                transition: inView ? 'stroke-dashoffset 2s ease-out' : 'none',
              }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-ink rotate-0">
            {count}%
          </span>
        </div>
        <div>
          <p className="text-ink font-semibold text-lg mb-1">100% Local</p>
          <p className="text-ink-muted text-sm">
            Your data never leaves your Mac. All processing happens on-device.
          </p>
        </div>
      </div>
    </Card>
  )
}

/* ════════════════════════════════════════════════════════
   6. Custom Dictionary
   ════════════════════════════════════════════════════════ */
const terms = ['React.js', 'Kubernetes', 'HIPAA', 'PostgreSQL']

function CustomDictionaryCard() {
  const [visibleTerms, setVisibleTerms] = useState<number[]>([])
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    setVisibleTerms([])
    let timers: ReturnType<typeof setTimeout>[] = []
    terms.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleTerms((prev) => [...prev, i])
      }, i * 700 + 300)
      timers.push(t)
    })
    // After all appear, wait then restart
    const resetTimer = setTimeout(() => {
      setCycle((c) => c + 1)
    }, terms.length * 700 + 2500)
    timers.push(resetTimer)
    return () => timers.forEach(clearTimeout)
  }, [cycle])

  return (
    <Card className="col-span-1 md:col-span-2">
      <Badge>Custom Dictionary</Badge>
      <div className="flex flex-wrap gap-3 min-h-[48px] my-2">
        {terms.map((term, i) => (
          <div
            key={`${term}-${cycle}`}
            className="flex items-center gap-1.5 bg-surface rounded-lg px-3 py-2 text-sm font-medium text-ink"
            style={{
              opacity: visibleTerms.includes(i) ? 1 : 0,
              transform: visibleTerms.includes(i) ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {term}
            <svg
              className="w-4 h-4 text-green-500"
              style={{
                opacity: visibleTerms.includes(i) ? 1 : 0,
                transition: 'opacity 0.3s ease 0.2s',
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ))}
      </div>
      <p className="text-ink-muted body-md mt-3">
        Teach Anna your jargon, names, and technical terms.
      </p>
    </Card>
  )
}

/* ════════════════════════════════════════════════════════
   Features Section
   ════════════════════════════════════════════════════════ */
export function FeaturesSection() {
  return (
    <section id="features" className="section-py">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header — left-aligned, editorial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-[clamp(3rem,6vw,6rem)]">
          <FadeIn>
            <h2 className="heading-lg text-ink">
              Everything you need
              <br />
              <span className="text-ink-muted">to ditch typing.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15} className="md:flex md:items-end md:justify-end">
            <p className="body-lg text-ink-muted max-w-[400px]">
              Anna combines powerful local AI with thoughtful design
              to make voice dictation feel completely effortless.
            </p>
          </FadeIn>
        </div>

        {/* Bento grid */}
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <AITranscriptionCard />
            <SmartFormattingCard />
            <StyleProfilesCard />
            <PrivacyFirstCard />
            <CustomDictionaryCard />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
