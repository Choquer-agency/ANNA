'use client'

import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { ArrowUpRight } from 'lucide-react'

const footerLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Download', href: '/signup' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export function Footer() {
  return (
    <footer
      className="relative bg-surface-dark text-white overflow-hidden"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 0,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-[#FF9E19]/[0.03] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Massive logo section */}
        <div className="pt-28 md:pt-40 pb-20 md:pb-28 flex flex-col items-center justify-center">
          <AnnaLogo className="w-full max-w-[600px] md:max-w-[800px] text-white/[0.04]" />
        </div>

        {/* Bottom nav */}
        <div className="pb-10 md:pb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
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
