import { HeroSection } from '@/components/home/HeroSection'
import { LogoMarqueeSection } from '@/components/home/LogoMarqueeSection'
import { StackingCardsSection } from '@/components/home/StackingCardsSection'
import { FeaturesSection } from '@/components/home/FeaturesSection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { CTASection } from '@/components/home/CTASection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LogoMarqueeSection />
      <StackingCardsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
