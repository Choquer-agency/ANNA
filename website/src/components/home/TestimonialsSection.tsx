'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { testimonials } from '@/lib/constants'
import { FadeIn } from '@/components/ui/FadeIn'

function TextCard({
  quote,
  author,
  role,
  avatar,
  accent,
}: {
  quote: string
  author: string
  role?: string
  avatar: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-[20px] p-7 flex flex-col justify-between h-full ${
        accent ? 'bg-primary-soft' : 'bg-[#2A2A2A]'
      }`}
    >
      {/* Avatar */}
      <div className="mb-5">
        <div className={`w-11 h-11 rounded-full overflow-hidden ring-2 ${accent ? 'ring-[#FF9E19]/30' : 'ring-white/10'}`}>
          <img
            src={avatar}
            alt={author}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Quote */}
      <blockquote
        className={`text-[0.95rem] leading-relaxed mb-6 flex-1 ${
          accent ? 'text-ink' : 'text-white/80'
        }`}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div>
        <p className={`font-semibold text-[0.95rem] ${accent ? 'text-ink' : 'text-white'}`}>
          {author}
        </p>
        {role && (
          <p className={`text-sm mt-0.5 ${accent ? 'text-ink-muted' : 'text-white/40'}`}>
            {role}
          </p>
        )}
      </div>
    </div>
  )
}

function VideoCard({
  quote,
  author,
  role,
  avatar,
  videoSrc,
}: {
  quote: string
  author: string
  role?: string
  avatar: string
  videoSrc?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) {
      v.pause()
    } else {
      v.play()
    }
    setPlaying(!playing)
  }

  return (
    <div className="rounded-[20px] overflow-hidden bg-[#2A2A2A] flex flex-col h-full">
      {/* Video area */}
      <div
        className="relative aspect-[4/3] bg-gradient-to-br from-[#3A3A3A] to-[#222] cursor-pointer group"
        onClick={togglePlay}
      >
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            onEnded={() => setPlaying(false)}
          />
        )}
        {/* Play/Pause overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors duration-300">
            {playing ? (
              <Pause className="w-6 h-6 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-7 flex flex-col flex-1">
        <p className="text-[0.95rem] text-white/80 leading-relaxed mb-5 flex-1">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/10">
            <img src={avatar} alt={author} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-[0.9rem] text-white">{author}</p>
            {role && <p className="text-xs text-white/40">{role}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector<HTMLElement>(':scope > div')?.offsetWidth ?? 340
    const gap = 20
    el.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) : cardWidth + gap,
      behavior: 'smooth',
    })
  }

  return (
    <section className="bg-surface-dark py-[clamp(5rem,10vw,10rem)] overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header row */}
        <div className="flex items-end justify-between mb-[clamp(2.5rem,5vw,4rem)]">
          <FadeIn>
            <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
              Testimonials
            </p>
            <h2 className="heading-lg text-white max-w-[500px]">
              Loved by people
              <br />
              <span className="text-white/40">who talk a lot.</span>
            </h2>
          </FadeIn>

          {/* Nav arrows */}
          <FadeIn delay={0.15} className="hidden md:flex items-center gap-3">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white transition-all duration-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white transition-all duration-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </FadeIn>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto px-6 md:px-10 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Left spacer to center within max-w-1400 */}
        <div className="shrink-0 hidden lg:block" style={{ width: 'max(0px, calc((100vw - 1400px) / 2))' }} />

        {testimonials.map((t) => (
          <div
            key={t.author}
            className="shrink-0 w-[300px] md:w-[340px] snap-start"
          >
            {t.type === 'video' ? (
              <VideoCard
                quote={t.quote}
                author={t.author}
                role={t.role}
                avatar={t.avatar}
                videoSrc={t.videoSrc}
              />
            ) : (
              <TextCard
                quote={t.quote}
                author={t.author}
                role={t.role}
                avatar={t.avatar}
                accent={t.accent}
              />
            )}
          </div>
        ))}

        {/* Right spacer */}
        <div className="shrink-0 w-6 md:w-10 lg:hidden" />
        <div className="shrink-0 hidden lg:block" style={{ width: 'max(0px, calc((100vw - 1400px) / 2))' }} />
      </div>
    </section>
  )
}
