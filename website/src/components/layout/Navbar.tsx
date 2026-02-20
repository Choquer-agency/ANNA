'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight, Download } from 'lucide-react'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const { onMouseMove } = usePlasmaHover()

  // Close download dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50)
  })

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 flex items-center justify-between h-[72px]">
        <a href="/" className="flex items-center">
          <AnnaLogo className="h-5 text-ink" />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[0.9rem] text-ink-muted hover:text-ink transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}

          {/* Download dropdown */}
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setDownloadOpen(!downloadOpen)}
              className="text-[0.9rem] text-ink-muted hover:text-ink transition-colors duration-300 cursor-pointer"
            >
              Download
            </button>
            <AnimatePresence>
              {downloadOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute top-full mt-3 left-1/2 -translate-x-1/2"
                >
                  <a
                    href="/download/mac"
                    onClick={() => setDownloadOpen(false)}
                    className="inline-flex items-center gap-2.5 whitespace-nowrap bg-white border border-border rounded-full px-5 py-2.5 text-[0.85rem] font-medium text-ink shadow-sm hover:shadow-md hover:border-ink/20 transition-all duration-300"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Anna</span>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="/login"
            className="text-[0.9rem] text-ink-muted hover:text-ink transition-colors duration-300"
          >
            Sign In
          </a>
          <a
            href="/signup"
            onMouseMove={onMouseMove}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full text-[0.9rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300"
          >
            <span className="relative z-[2]">Get Anna</span>
            <ArrowRight className="relative z-[2] w-4 h-4" />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-ink"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-surface border-b border-border px-6 pb-8 pt-4"
        >
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-lg text-ink-secondary hover:text-ink"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/download/mac"
              className="inline-flex items-center gap-2 text-lg text-ink-secondary hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              <Download className="w-4 h-4" />
              Download Anna
            </a>
            <hr className="border-border" />
            <a href="/login" className="text-lg text-ink-secondary">
              Sign In
            </a>
            <a
              href="/signup"
              onMouseMove={onMouseMove}
              className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-full text-base font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300"
            >
              <span className="relative z-[2]">Get Anna</span>
              <ArrowRight className="relative z-[2] w-4 h-4" />
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
