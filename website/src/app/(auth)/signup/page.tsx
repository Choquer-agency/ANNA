'use client'

import { SignUpForm } from '@/components/auth/SignUpForm'
import { AnnaLogo } from '@/components/ui/AnnaLogo'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — vibrant gradient panel */}
      <div className="hidden lg:block w-[50%] p-5 pr-0">
        <div className="relative h-full rounded-[24px] overflow-hidden">
          {/* Vibrant gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 10% 0%, #FF9E19 0%, transparent 40%), radial-gradient(ellipse at 80% 10%, #EBC1FF 0%, transparent 45%), radial-gradient(ellipse at 50% 60%, #FFDBA6 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, #EBC1FF 0%, transparent 40%), #FFF8F0',
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col justify-between h-full p-10">
            {/* Logo top-left */}
            <a href="/">
              <AnnaLogo className="h-5 text-ink" />
            </a>

            {/* Heading bottom-left */}
            <div className="max-w-[520px] pb-4">
              <p className="text-base font-medium text-ink-muted/70 mb-4">Get started for free</p>
              <h2
                className="text-ink tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw + 0.5rem, 4.5rem)',
                  lineHeight: 1.05,
                  fontWeight: 500,
                }}
              >
                Turn your voice into
                <br />
                polished text, anywhere
                <br />
                you type.
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form side */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <SignUpForm />
      </div>
    </div>
  )
}
