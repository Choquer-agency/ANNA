'use client'

import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { FadeIn } from '@/components/ui/FadeIn'
import { ease } from '@/lib/animations'

/* ═══════════════════════════════════════════════════════
   Feature 1: AI Auto Edits — illustration
   ═══════════════════════════════════════════════════════ */
function AIAutoEditsIllustration() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div ref={ref} className="relative w-full aspect-[4/3.5] rounded-[24px] overflow-hidden bg-[#FDF5FF]">
      {/* Blurred background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 40% 30%, #E8B4FF 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #FFDBA6 0%, transparent 50%), #FDF5FF',
          filter: 'blur(30px)',
          opacity: 0.6,
        }}
      />

      {/* Raw text block with annotations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-black/5">
          <p className="text-[0.8rem] md:text-sm text-ink-muted leading-[1.8] font-mono">
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">uh yeah so</span>{' '}
            I think we should probably reach out to Jenny from{' '}
            <span className="border-b-2 border-accent-pink">Lennar</span>{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">I think</span>{' '}
            she said something about the NDA being{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">like</span>{' '}
            not ready yet or maybe she{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">um</span>{' '}
            already sent it{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">I&apos;m not sure</span>{' '}
            and we should cc{' '}
            <span className="border-b-2 border-accent-pink">Micheal</span>{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">um</span>{' '}
            also update the Q2 goals{' '}
            <span className="border-b-2 border-accent-pink">sliddes</span>{' '}
            before Friday&apos;s{' '}
            <span className="bg-accent-pink/30 px-0.5 rounded line-through decoration-accent-pink/70">thing</span>{' '}
            review
          </p>

          {/* Annotation badges — pink, large */}
          <motion.span
            initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: -4 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="absolute -top-4 -left-2 md:-top-4 md:-left-3 bg-accent-pink text-ink text-xs md:text-sm font-semibold px-4 py-1.5 md:px-5 md:py-2 rounded-full shadow-lg"
          >
            Removed filler
          </motion.span>

          <motion.span
            initial={{ opacity: 0, scale: 0.8, rotate: 3 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: 3 } : {}}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="absolute top-10 -right-2 md:top-12 md:-right-3 bg-accent-pink text-ink text-xs md:text-sm font-semibold px-4 py-1.5 md:px-5 md:py-2 rounded-full shadow-lg"
          >
            Added to Dictionary
          </motion.span>

          <motion.span
            initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: -2 } : {}}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="absolute bottom-10 -left-2 md:bottom-12 md:-left-3 bg-accent-pink text-ink text-xs md:text-sm font-semibold px-4 py-1.5 md:px-5 md:py-2 rounded-full shadow-lg"
          >
            Fixed spelling
          </motion.span>
        </div>
      </motion.div>

      {/* Clean polished output */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6"
      >
        <div className="bg-[#1B1B1B] rounded-2xl p-5 md:p-6 shadow-xl">
          <p className="text-white/90 text-[0.8rem] md:text-sm leading-[1.8]">
            I think we should reach out to Jenny from Lennar — she said something about the NDA not being ready yet, or she may have already sent it. We should also CC Michael and update the Q2 Goals slides before Friday&apos;s review.
          </p>
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3 text-white/30">
              <span className="text-sm font-bold">B</span>
              <span className="text-sm italic">I</span>
              <span className="text-sm line-through">S</span>
              <span className="text-sm">🔗</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Feature 2: Personal Dictionary — illustration
   ═══════════════════════════════════════════════════════ */
const dictionaryWords = [
  { word: 'Jordan Mitchell', category: 'Name' },
  { word: 'PostgreSQL', category: 'Technical' },
  { word: 'Kubernetes', category: 'Technical' },
  { word: 'Anna AI', category: 'Company' },
  { word: 'Vercel', category: 'Company' },
  { word: 'Figma', category: 'Product' },
  { word: 'Next.js', category: 'Technical' },
  { word: 'Anthropic', category: 'Company' },
]

const categoryColors: Record<string, string> = {
  Name: 'bg-blue-100 text-blue-700',
  Technical: 'bg-purple-100 text-purple-700',
  Company: 'bg-green-100 text-green-700',
  Product: 'bg-amber-100 text-amber-700',
}

function PersonalDictionaryIllustration() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div ref={ref} className="w-full aspect-[4/3.5] rounded-[24px] overflow-hidden bg-[#FAFAFA] p-5 md:p-7 flex flex-col">
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease }}
        className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-black/5 mb-4"
      >
        <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-ink-muted">Search your dictionary...</span>
      </motion.div>

      {/* Word list */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {dictionaryWords.map((entry, i) => (
          <motion.div
            key={entry.word}
            initial={{ opacity: 0, x: -15 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, ease, delay: 0.15 + i * 0.07 }}
            className="bg-white rounded-xl px-4 py-2.5 flex items-center justify-between border border-black/5"
          >
            <span className="text-sm font-medium text-ink">{entry.word}</span>
            <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${categoryColors[entry.category] || 'bg-surface-alt text-ink-muted'}`}>
              {entry.category}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Feature 3: 100+ Languages — illustration
   Big hello cycling through languages with waveform
   ═══════════════════════════════════════════════════════ */
const languages = [
  { flag: '🇺🇸', hello: 'Hello' },
  { flag: '🇪🇸', hello: 'Hola' },
  { flag: '🇫🇷', hello: 'Bonjour' },
  { flag: '🇯🇵', hello: 'こんにちは' },
  { flag: '🇰🇷', hello: '안녕하세요' },
  { flag: '🇧🇷', hello: 'Olá' },
  { flag: '🇨🇳', hello: '你好' },
]

// Waveform bar presets for language illustration
const langWaveformBars = Array.from({ length: 7 }).map((_, i) => ({
  height: 30 + ((i * 37 + 13) % 65),
  duration: 0.6 + ((i * 53 + 7) % 50) / 100,
}))

function LanguagesIllustration() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [activeLang, setActiveLang] = useState(0)

  useEffect(() => {
    if (!inView) return
    const interval = setInterval(() => {
      setActiveLang((a) => (a + 1) % languages.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [inView])

  const lang = languages[activeLang]

  return (
    <div ref={ref} className="w-full aspect-[4/3.5] rounded-[24px] overflow-hidden bg-[#FDF5FF] relative flex flex-col items-center justify-center">
      {/* Pink glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 40%, rgba(235,193,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 75% 65%, rgba(235,193,255,0.15) 0%, transparent 45%)',
      }} />

      {/* Floating background bubbles — arranged in a ring around center */}
      {[
        { flag: '🇮🇹', text: 'Ciao', x: 14, y: 12, rot: -4, dur: 5.5 },
        { flag: '🇩🇪', text: 'Hallo', x: 52, y: 6, rot: 2, dur: 6.2 },
        { flag: '🇬🇷', text: 'Γεια', x: 86, y: 14, rot: -3, dur: 5.8 },
        { flag: '🇷🇺', text: 'Привет', x: 6, y: 42, rot: 3, dur: 6.0 },
        { flag: '🇮🇳', text: 'नमस्ते', x: 92, y: 44, rot: -2, dur: 5.6 },
        { flag: '🇹🇭', text: 'สวัสดี', x: 4, y: 72, rot: 2, dur: 6.3 },
        { flag: '🇻🇳', text: 'Xin chào', x: 90, y: 70, rot: -3, dur: 5.4 },
        { flag: '🇸🇦', text: 'مرحباً', x: 16, y: 90, rot: 4, dur: 5.9 },
        { flag: '🇹🇷', text: 'Merhaba', x: 54, y: 93, rot: -2, dur: 6.1 },
        { flag: '🇵🇱', text: 'Cześć', x: 84, y: 88, rot: 3, dur: 5.7 },
      ].map((b, i) => (
        <motion.div
          key={b.flag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? {
            opacity: [0.45, 0.6, 0.45],
            scale: 1,
            y: [0, -6, 0, 5, 0],
            x: [0, 4, 0, -3, 0],
            rotate: [b.rot, b.rot + 1, b.rot, b.rot - 1, b.rot],
          } : {}}
          transition={{
            opacity: { duration: b.dur, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.6, delay: 0.15 + i * 0.07 },
            y: { duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
            x: { duration: b.dur * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 },
            rotate: { duration: b.dur * 1.5, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="absolute bg-white rounded-full px-5 py-3 flex items-center gap-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-black/[0.04]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span className="text-lg">{b.flag}</span>
          <span className="text-sm font-medium text-ink/70">{b.text}</span>
        </motion.div>
      ))}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeLang}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease }}
          className="flex flex-col items-center"
        >
          {/* Flag */}
          <span className="text-2xl md:text-3xl mb-3">{lang.flag}</span>

          {/* Big hello */}
          <h3
            className="text-ink font-medium text-center"
            style={{
              fontSize: 'clamp(2.5rem, 5vw + 1rem, 4.5rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
            }}
          >
            {lang.hello}
          </h3>

          {/* Waveform */}
          <div className="flex items-center justify-center gap-[3px] h-8 mt-5">
            {langWaveformBars.map((bar, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, #FF6B9D 0%, rgba(255,255,255,0.85) 24%, rgba(255,255,255,0.85) 76%, #FF9E19 100%)',
                }}
                animate={{
                  height: ['20%', `${bar.height}%`, '20%'],
                }}
                transition={{
                  duration: bar.duration,
                  delay: i * 0.06,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Speed Comparison — Live Race
   ═══════════════════════════════════════════════════════ */
const raceParagraph =
  'Let\'s reach out to the design team about the new landing page. I think we should prioritize the hero section and make sure the call-to-action is clear. Also, can someone loop in marketing? We need their input on messaging before Friday\'s review.'

const raceWords = raceParagraph.split(' ')
const TOTAL_WORDS = raceWords.length
// Keyboard: 45 wpm = ~0.75 words/sec → entire paragraph in ~60 words / 0.75 = 80s
// We compress to 12s for the demo so keyboard finishes in 12s
// Anna at 4.9x finishes in ~2.45s
const KEYBOARD_DURATION = 12000
const ANNA_DURATION = 2450
const KEYBOARD_CHAR_MS = KEYBOARD_DURATION / raceParagraph.length
const ANNA_WORD_MS = ANNA_DURATION / TOTAL_WORDS

// Waveform bar presets — 7 bars matching Anna's recording pill
// Center bar tallest, outer bars decay symmetrically
const raceWaveformBars = [
  { height: 40, duration: 0.7 },
  { height: 60, duration: 0.55 },
  { height: 80, duration: 0.6 },
  { height: 95, duration: 0.5 },
  { height: 80, duration: 0.65 },
  { height: 60, duration: 0.55 },
  { height: 40, duration: 0.7 },
]

function SpeedComparison() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [phase, setPhase] = useState<'idle' | 'racing' | 'done'>('idle')
  const [keyboardChars, setKeyboardChars] = useState(0)
  const [annaWords, setAnnaWords] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(0)
  const keyboardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const annaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-start on scroll into view
  useEffect(() => {
    if (inView && phase === 'idle') {
      const delay = setTimeout(() => startRace(), 600)
      return () => clearTimeout(delay)
    }
  }, [inView, phase])

  function startRace() {
    setPhase('racing')
    setKeyboardChars(0)
    setAnnaWords(0)
    setElapsed(0)
    startTimeRef.current = Date.now()

    // Clock
    clockRef.current = setInterval(() => {
      setElapsed(((Date.now() - startTimeRef.current) / 1000))
    }, 50)

    // Keyboard: character by character
    let kChar = 0
    keyboardTimerRef.current = setInterval(() => {
      kChar++
      setKeyboardChars(kChar)
      if (kChar >= raceParagraph.length) {
        if (keyboardTimerRef.current) clearInterval(keyboardTimerRef.current)
      }
    }, KEYBOARD_CHAR_MS)

    // Anna: word by word (fast bursts)
    let aWord = 0
    annaTimerRef.current = setInterval(() => {
      aWord++
      setAnnaWords(aWord)
      if (aWord >= TOTAL_WORDS) {
        if (annaTimerRef.current) clearInterval(annaTimerRef.current)
      }
    }, ANNA_WORD_MS)
  }

  // Detect done — auto-loop after a pause
  useEffect(() => {
    if (phase === 'racing' && annaWords >= TOTAL_WORDS) {
      setTimeout(() => {
        setPhase('done')
        if (keyboardTimerRef.current) clearInterval(keyboardTimerRef.current)
        if (clockRef.current) clearInterval(clockRef.current)
      }, 300)
    }
    if (phase === 'done') {
      const restartTimer = setTimeout(() => {
        setPhase('idle')
        setTimeout(() => startRace(), 400)
      }, 3500)
      return () => clearTimeout(restartTimer)
    }
  }, [annaWords, phase])

  // Cleanup
  useEffect(() => {
    return () => {
      if (keyboardTimerRef.current) clearInterval(keyboardTimerRef.current)
      if (annaTimerRef.current) clearInterval(annaTimerRef.current)
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [])

  const keyboardProgress = Math.min(keyboardChars / raceParagraph.length, 1)
  const annaProgress = Math.min(annaWords / TOTAL_WORDS, 1)
  const annaFinished = annaWords >= TOTAL_WORDS

  const keyboardText = raceParagraph.slice(0, keyboardChars)
  const annaText = raceWords.slice(0, annaWords).join(' ')

  return (
    <div ref={ref} className="mt-20 md:mt-32">
      <FadeIn className="text-center mb-14 md:mb-20">
        <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-5">
          Why voice?
        </p>
        <h2
          className="text-ink max-w-[700px] mx-auto"
          style={{
            fontSize: 'clamp(1.75rem, 3vw + 0.75rem, 3.25rem)',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            fontWeight: 500,
          }}
        >
          Speak at the speed
          <br />
          of thought.
        </h2>
        <p className="body-lg text-ink-muted max-w-[500px] mx-auto mt-5">
          Watch both methods write the same message. The difference is instant.
        </p>
      </FadeIn>

      {/* Race arena */}
      <div className="max-w-[1100px] mx-auto">
        {/* Timer + status bar */}
        <FadeIn>
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${phase === 'racing' ? 'bg-red-500 animate-pulse' : phase === 'done' ? 'bg-green-500' : 'bg-ink-muted/30'}`} />
              <span className="text-sm font-medium text-ink-muted">
                {phase === 'idle' ? 'Ready' : phase === 'racing' ? 'Racing...' : 'Complete'}
              </span>
            </div>
            <div className="font-mono text-sm text-ink-muted tabular-nums">
              {elapsed.toFixed(1)}s
            </div>
          </div>
        </FadeIn>

        {/* Two panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Keyboard panel */}
          <FadeIn delay={0.1}>
            <div className="bg-white rounded-[20px] border border-black/5 p-6 md:p-7 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-alt flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Keyboard</p>
                    <p className="text-xs text-ink-muted">45 words per minute</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-ink-muted tabular-nums">
                  {Math.round(keyboardProgress * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden mb-5">
                <motion.div
                  className="h-full bg-ink-muted/25 rounded-full"
                  style={{ width: `${keyboardProgress * 100}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>

              {/* Text area */}
              <div className="flex-1 min-h-[180px] bg-surface rounded-xl p-4 relative overflow-hidden">
                <p className="text-sm text-ink leading-relaxed font-mono">
                  {keyboardText}
                  {phase === 'racing' && !annaFinished && (
                    <span className="inline-block w-[2px] h-[1.1em] bg-ink/60 ml-[1px] align-text-bottom animate-[blink_1s_step-end_infinite]" />
                  )}
                </p>
                {phase !== 'idle' && (
                  <div className="absolute bottom-3 right-3">
                    <span className="text-[0.65rem] font-mono text-ink-muted/50">
                      {keyboardChars}/{raceParagraph.length} chars
                    </span>
                  </div>
                )}
              </div>

              {/* Mini keyboard visual */}
              <div className="mt-4 flex justify-center gap-[3px]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-7 h-5 rounded bg-surface-alt border border-border"
                    animate={phase === 'racing' && !annaFinished ? {
                      backgroundColor: [
                        'var(--color-surface-alt)',
                        i === Math.floor(keyboardChars % 10) ? 'var(--color-border-strong)' : 'var(--color-surface-alt)',
                        'var(--color-surface-alt)',
                      ],
                    } : {}}
                    transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 0.3 + i * 0.05 }}
                  />
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Anna panel */}
          <FadeIn delay={0.2}>
            <div className="bg-white rounded-[20px] border-2 border-primary/20 p-6 md:p-7 h-full flex flex-col relative overflow-hidden">
              {/* Glow */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(255,158,25,0.04) 0%, transparent 60%)',
              }} />

              {/* Header */}
              <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Anna Voice</p>
                    <p className="text-xs text-ink-muted">220 words per minute</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-primary tabular-nums font-semibold">
                  {Math.round(annaProgress * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 bg-surface-alt rounded-full overflow-hidden mb-5">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  style={{ width: `${annaProgress * 100}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>

              {/* Text area */}
              <div className="relative flex-1 min-h-[180px] bg-[#1B1B1B] rounded-xl p-4 overflow-hidden">
                <p className="text-sm text-white/90 leading-relaxed">
                  {annaText}
                  {phase === 'racing' && !annaFinished && (
                    <span className="inline-block w-[2px] h-[1.1em] bg-primary ml-[1px] align-text-bottom animate-[blink_1s_step-end_infinite]" />
                  )}
                </p>
                {phase !== 'idle' && (
                  <div className="absolute bottom-3 right-3">
                    <span className="text-[0.65rem] font-mono text-white/25">
                      {annaWords}/{TOTAL_WORDS} words
                    </span>
                  </div>
                )}
              </div>

              {/* Waveform — 7 bars matching Anna's recording pill */}
              <div className="mt-4 flex items-end justify-center gap-[3px] h-12">
                {raceWaveformBars.map((bar, i) => (
                  <motion.div
                    key={i}
                    className="w-[4px] rounded-full"
                    style={{
                      background: 'linear-gradient(to bottom, #FF6B9D 0%, rgba(255,255,255,0.85) 24%, rgba(255,255,255,0.85) 76%, #FF9E19 100%)',
                    }}
                    initial={{ height: '12%' }}
                    animate={(phase === 'racing' && !annaFinished) ? {
                      height: ['12%', `${bar.height}%`, '12%'],
                    } : { height: '12%' }}
                    transition={{
                      duration: bar.duration,
                      delay: i * 0.04,
                      repeat: Infinity,
                      repeatType: 'loop',
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Done badge */}
              {annaFinished && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease }}
                  className="absolute top-5 right-5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg"
                >
                  Done! 4.9x faster
                </motion.div>
              )}
            </div>
          </FadeIn>
        </div>

        {/* Stats row — same width as race panels */}
        <FadeIn delay={0.3}>
          <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
            <div className="text-center py-8 md:py-10">
              <p className="text-5xl md:text-7xl font-bold text-primary tracking-tight">4.9x</p>
              <p className="text-xs md:text-sm text-ink-muted mt-3">Faster than typing</p>
            </div>
            <div className="text-center py-8 md:py-10">
              <p className="text-5xl md:text-7xl font-bold text-primary tracking-tight">99.2%</p>
              <p className="text-xs md:text-sm text-ink-muted mt-3">Accuracy</p>
            </div>
            <div className="text-center py-8 md:py-10">
              <p className="text-5xl md:text-7xl font-bold text-primary tracking-tight">220+</p>
              <p className="text-xs md:text-sm text-ink-muted mt-3">Words per minute</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Feature Row Component
   ═══════════════════════════════════════════════════════ */
function FeatureRow({
  eyebrow,
  title,
  description,
  illustration,
  reversed = false,
}: {
  eyebrow: string
  title: string
  description: string
  illustration: React.ReactNode
  reversed?: boolean
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center ${reversed ? '' : ''}`}>
      <FadeIn className={reversed ? 'lg:order-2' : ''}>
        {illustration}
      </FadeIn>
      <FadeIn delay={0.15} className={reversed ? 'lg:order-1' : ''}>
        <div className={reversed ? 'lg:pr-4' : 'lg:pl-4'}>
          <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
            {eyebrow}
          </p>
          <h3
            className="text-ink mb-5"
            style={{
              fontSize: 'clamp(1.75rem, 2.5vw + 0.75rem, 2.75rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              fontWeight: 500,
            }}
          >
            {title}
          </h3>
          <p className="body-lg text-ink-muted max-w-[460px] leading-relaxed">
            {description}
          </p>
        </div>
      </FadeIn>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Features Section
   ═══════════════════════════════════════════════════════ */
export function FeaturesSection() {
  return (
    <section id="features" className="section-py">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 space-y-24 md:space-y-32">
        {/* Feature 1: AI Auto Edits */}
        <FeatureRow
          eyebrow="AI Auto Edits"
          title="Speak messy. Send polished."
          description="Speak naturally and Anna transcribes and edits your voice, instantly. Rambled thoughts become clear, perfectly formatted text — without the filler words or typos."
          illustration={<AIAutoEditsIllustration />}
        />

        {/* Feature 2: Personal Dictionary */}
        <FeatureRow
          eyebrow="Personal Dictionary"
          title="It learns how you speak."
          description="Teach Anna your unique vocabulary — names, company terms, technical jargon. Your custom dictionary ensures every word is spelled exactly the way you want."
          illustration={<PersonalDictionaryIllustration />}
          reversed
        />

        {/* Feature 3: 100+ Languages */}
        <FeatureRow
          eyebrow="100+ Languages"
          title="Your language, automatically."
          description="Anna automatically detects and transcribes in your language. Switch between languages mid-conversation — no settings to change, no buttons to press."
          illustration={<LanguagesIllustration />}
        />

        {/* Speed Comparison */}
        <SpeedComparison />
      </div>
    </section>
  )
}
