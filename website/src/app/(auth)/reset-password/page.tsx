'use client'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { AnnaLogo } from '@/components/ui/AnnaLogo'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — animated gradient panel */}
      <div className="hidden lg:block w-[50%] p-5 pr-0">
        <div className="relative h-full rounded-[24px] overflow-hidden bg-[#FFF8F0]">
          {/* Animated blobs */}
          <div className="absolute w-[500px] h-[500px] top-[-10%] left-[-5%] rounded-full bg-[#FF9E19]/50 blur-[100px]" style={{ animation: 'blob-drift-1 12s ease-in-out infinite' }} />
          <div className="absolute w-[400px] h-[400px] top-[5%] right-[-5%] rounded-full bg-[#EBC1FF]/60 blur-[90px]" style={{ animation: 'blob-drift-2 14s ease-in-out infinite' }} />
          <div className="absolute w-[450px] h-[450px] bottom-[20%] left-[20%] rounded-full bg-[#FFDBA6]/50 blur-[100px]" style={{ animation: 'blob-drift-3 16s ease-in-out infinite' }} />
          <div className="absolute w-[350px] h-[350px] bottom-[-5%] right-[10%] rounded-full bg-[#EBC1FF]/45 blur-[80px]" style={{ animation: 'blob-drift-4 13s ease-in-out infinite' }} />

          {/* Content */}
          <div className="relative flex flex-col justify-between h-full p-10">
            <a href="/">
              <AnnaLogo className="h-5 text-ink" />
            </a>

            <div className="max-w-[520px] pb-4">
              <p className="text-base font-medium text-ink-muted/70 mb-4">No worries</p>
              <h2
                className="text-ink tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw + 0.5rem, 4.5rem)',
                  lineHeight: 1.05,
                  fontWeight: 500,
                }}
              >
                We&apos;ll help you
                <br />
                get back in.
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form side */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
