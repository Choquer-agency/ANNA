'use client'

import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'
import { motion } from 'framer-motion'

const footerLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Download', href: '/signup' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export function Footer() {
  const { onMouseMove } = usePlasmaHover()

  return (
    <footer className="relative bg-surface-dark text-white overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[300px] -left-[200px] w-[600px] h-[600px] rounded-full bg-[#FF9E19]/[0.04] blur-[120px]" />
        <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-[#FF9E19]/[0.03] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-white/[0.01] blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Hero CTA area */}
        <div className="pt-24 md:pt-36 pb-20 md:pb-28 border-b border-white/[0.06]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="text-[0.8rem] uppercase tracking-[0.2em] text-white/25 font-medium mb-8">
              Start dictating today
            </p>

            {/* Large typographic headline */}
            <h2 className="text-[clamp(2.5rem,6vw+0.5rem,5.5rem)] font-medium leading-[0.95] tracking-[-0.04em] text-white max-w-[900px]">
              Your voice deserves
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9E19] via-[#FFB84D] to-[#FF9E19]">
                better software.
              </span>
            </h2>

            <div className="mt-12 flex flex-col sm:flex-row items-start gap-4">
              <a
                href="/signup"
                onMouseMove={onMouseMove}
                className="plasma-hover inline-flex items-center gap-2.5 bg-white text-surface-dark px-8 py-4 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-500 group"
              >
                <span className="relative z-[2]">Get Anna — Free</span>
                <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <span className="text-[0.8rem] text-white/25 mt-3 sm:mt-4 ml-1">
                macOS 13+. Apple Silicon &amp; Intel.
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom nav */}
        <div className="py-10 md:py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Logo + copyright */}
          <div className="flex items-center gap-6">
            <AnnaLogo className="h-4 text-white/30" />
            <span className="text-[0.8rem] text-white/20">
              &copy; {new Date().getFullYear()} Choquer Creative Corp.
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group inline-flex items-center gap-1 text-[0.85rem] text-white/35 hover:text-white/80 transition-colors duration-300"
              >
                {link.label}
                <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
