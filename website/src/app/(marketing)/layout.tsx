import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SmoothScroll } from '@/components/layout/SmoothScroll'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="relative z-10 bg-surface min-h-screen overflow-x-hidden">{children}</main>
      <Footer />
    </SmoothScroll>
  )
}
