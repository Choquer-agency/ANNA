'use client'

import { useState } from 'react'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { ArrowUpRight, ArrowRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

const footerLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
]

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

const supportTypes = [
  'General question',
  'Bug report',
  'Feature request',
  'Account issue',
  'Billing',
  'Other',
]

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { onMouseMove } = usePlasmaHover()
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '', _hp: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Honeypot check — if the hidden field is filled, silently "succeed"
    if (form._hp) {
      setSubmitted(true)
      return
    }

    setSubmitting(true)
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, type: form.type, message: form.message }),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset after animation
    setTimeout(() => {
      setForm({ name: '', email: '', type: '', message: '', _hp: '' })
      setSubmitted(false)
    }, 300)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative bg-white rounded-2xl p-8 w-full max-w-[480px] shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-6">
                <h2 className="text-xl font-bold text-ink mb-2">Message sent!</h2>
                <p className="text-sm text-ink-muted">
                  We&apos;ll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-ink mb-1">Support</h2>
                <p className="text-sm text-ink-muted mb-6">
                  How can we help? Send us a message and we&apos;ll get back to you.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="support-name" className="block text-sm font-medium text-ink mb-1.5">
                      Name
                    </label>
                    <input
                      id="support-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="support-email" className="block text-sm font-medium text-ink mb-1.5">
                      Email
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="support-type" className="block text-sm font-medium text-ink mb-1.5">
                      What do you need help with?
                    </label>
                    <select
                      id="support-type"
                      required
                      value={form.type}
                      onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a topic</option>
                      {supportTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-message" className="block text-sm font-medium text-ink mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="support-message"
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                      placeholder="Describe your issue or question..."
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>

                  {/* Honeypot — hidden from humans, bots will fill it */}
                  <div className="absolute opacity-0 top-0 left-0 h-0 w-0 -z-10" aria-hidden="true">
                    <label htmlFor="support-website">Website</label>
                    <input
                      id="support-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form._hp}
                      onChange={(e) => setForm((s) => ({ ...s, _hp: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    onMouseMove={onMouseMove}
                    className="plasma-hover mt-2 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold bg-primary text-white hover:bg-primary-hover transition-all duration-300 cursor-pointer disabled:opacity-60"
                  >
                    <span className="relative z-[2]">{submitting ? 'Sending...' : 'Send Message'}</span>
                    {!submitting && <ArrowRight className="relative z-[2] w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Footer() {
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <>
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
              <AnnaLogo className="h-4 text-white" />
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

              <button
                onClick={() => setSupportOpen(true)}
                className="group inline-flex items-center gap-1 text-[0.85rem] text-white/35 hover:text-white/80 transition-colors duration-300 cursor-pointer"
              >
                Support
                <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
              </button>

              {legalLinks.map((link) => (
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

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}
