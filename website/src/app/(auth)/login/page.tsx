'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { AnnaLogo } from '@/components/ui/AnnaLogo'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — orange gradient panel, inset with padding */}
      <div className="hidden lg:block w-[50%] p-5 pr-0">
        <div className="relative h-full rounded-[24px] overflow-hidden">
          {/* Warm gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, #f5ede4 0%, #f0ddd0 25%, #edc8a8 50%, #e8b890 70%, #f0ddd0 100%)',
            }}
          />
          {/* Soft orange blobs */}
          <div className="absolute inset-0">
            <div className="absolute w-[500px] h-[500px] top-[20%] left-[30%] rounded-full bg-[#e8a060]/40 blur-[100px]" />
            <div className="absolute w-[300px] h-[300px] top-[40%] left-[10%] rounded-full bg-[#d4956a]/30 blur-[80px]" />
            <div className="absolute w-[400px] h-[400px] bottom-[10%] right-[10%] rounded-full bg-[#f0c8a0]/30 blur-[90px]" />
          </div>

          {/* Content */}
          <div className="relative flex flex-col justify-between h-full p-10">
            {/* Logo top-left */}
            <a href="/">
              <AnnaLogo className="h-5 text-ink" />
            </a>

            {/* Heading bottom-left */}
            <div className="max-w-[380px] pb-4">
              <p className="text-sm font-medium text-ink-muted/70 mb-3">Welcome back</p>
              <h2 className="text-[2rem] leading-[1.2] font-semibold text-ink tracking-[-0.02em]">
                Your voice, perfectly
                <br />
                typed into anything.
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form side */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <LoginForm />
      </div>
    </div>
  )
}
