import {
  Mic,
  Sparkles,
  Palette,
  Globe,
  Shield,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export const features: Feature[] = [
  {
    icon: Mic,
    title: 'AI Transcription',
    description:
      'Powered by state-of-the-art speech recognition that understands context, jargon, and natural speech patterns.',
  },
  {
    icon: Sparkles,
    title: 'Smart Formatting',
    description:
      'Automatically adds punctuation, capitalization, and paragraph breaks. Your text comes out polished.',
  },
  {
    icon: Palette,
    title: 'Style Profiles',
    description:
      'Create custom voice profiles for emails, code comments, notes, or any writing style you need.',
  },
  {
    icon: Globe,
    title: 'Universal Dictation',
    description:
      'Works in any app — your browser, code editor, Slack, email, or anywhere you can type.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Audio is processed locally on your Mac. Your voice data never leaves your device.',
  },
  {
    icon: BookOpen,
    title: 'Custom Dictionary',
    description:
      'Teach Anna your terminology, product names, and technical terms for perfect accuracy.',
  },
]

export interface Step {
  number: string
  title: string
  description: string
}

export const howItWorksSteps: Step[] = [
  {
    number: '01',
    title: 'Press your shortcut',
    description: 'Hit your custom keyboard shortcut from any app to start dictating.',
  },
  {
    number: '02',
    title: 'Speak naturally',
    description: 'Talk as you normally would. Anna understands context and natural speech.',
  },
  {
    number: '03',
    title: 'Text appears',
    description: 'Polished, formatted text is typed right where your cursor is.',
  },
]

export interface Stat {
  value: number
  suffix: string
  label: string
}

export const stats: Stat[] = [
  { value: 4000, suffix: '+', label: 'Words/week free' },
  { value: 99.2, suffix: '%', label: 'Accuracy' },
  { value: 50, suffix: 'ms', label: 'Latency' },
  { value: 100, suffix: '%', label: 'Local processing' },
]

export interface Testimonial {
  quote: string
  author: string
  role?: string
  avatar: string
  type: 'text' | 'video'
  videoSrc?: string
  accent?: boolean
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'Anna completely changed how I write emails. I just talk and perfect prose appears. It saves me at least an hour every day.',
    author: 'Sarah Chen',
    role: 'Product Manager',
    avatar: '/images/avatars/sarah.jpg',
    type: 'text',
  },
  {
    quote:
      "The accuracy is unreal. It even gets my technical jargon right. I've tried every dictation tool — Anna is in a different league.",
    author: 'Marcus Rivera',
    role: 'Software Engineer',
    avatar: '/images/avatars/marcus.jpg',
    type: 'text',
    accent: true,
  },
  {
    quote:
      "I have RSI and Anna has been a lifesaver. The style profiles let me switch between casual Slack messages and formal reports effortlessly.",
    author: 'Emily Nakamura',
    role: 'UX Researcher',
    avatar: '/images/avatars/emily.jpg',
    type: 'text',
  },
  {
    quote: 'Watch how I use Anna to write an entire blog post in under 5 minutes.',
    author: 'Jake Thompson',
    role: 'Content Creator',
    avatar: '/images/avatars/jake.jpg',
    type: 'video',
    videoSrc: '/videos/testimonial-1.mp4',
  },
  {
    quote:
      'I dictate all my patient notes with Anna now. It understands medical terminology perfectly and the formatting is always spot on.',
    author: 'Dr. Priya Patel',
    role: 'Physician',
    avatar: '/images/avatars/priya.jpg',
    type: 'text',
  },
  {
    quote:
      'As a non-native English speaker, Anna helps me write natural-sounding emails in seconds. Total game changer for my confidence.',
    author: 'Tomás Herrera',
    role: 'Sales Lead',
    avatar: '/images/avatars/tomas.jpg',
    type: 'text',
    accent: true,
  },
  {
    quote:
      'I switched from Whisper to Anna and the difference is night and day. Custom dictionary alone was worth it for all my brand names.',
    author: 'Aisha Johnson',
    role: 'Marketing Director',
    avatar: '/images/avatars/aisha.jpg',
    type: 'text',
  },
  {
    quote: 'Here is my honest review after 3 months of using Anna every single day.',
    author: 'Lena Kowalski',
    role: 'Freelance Writer',
    avatar: '/images/avatars/lena.jpg',
    type: 'video',
    videoSrc: '/videos/testimonial-2.mp4',
  },
  {
    quote:
      'Style profiles are genius. I have one for Slack, one for email, one for Notion docs. It just gets my tone right every time.',
    author: 'Daniel Okonkwo',
    role: 'Engineering Manager',
    avatar: '/images/avatars/daniel.jpg',
    type: 'text',
  },
  {
    quote:
      'I write 10x more now. Not because Anna is faster than typing — it is — but because there is zero friction to getting my thoughts down.',
    author: 'Rachel Kim',
    avatar: '/images/avatars/rachel.jpg',
    type: 'text',
    accent: true,
  },
  {
    quote:
      'Privacy was my biggest concern. The fact that everything stays local on my Mac made Anna the only option I would even consider.',
    author: 'Ben Carlisle',
    role: 'Security Consultant',
    avatar: '/images/avatars/ben.jpg',
    type: 'text',
  },
  {
    quote: 'Anna is the tool I recommend to every creator I know. Let me show you why.',
    author: 'Sofia Morales',
    role: 'YouTuber',
    avatar: '/images/avatars/sofia.jpg',
    type: 'video',
    videoSrc: '/videos/testimonial-3.mp4',
  },
]

export interface PricingTier {
  name: string
  price: { monthly: number; annual: number } | null
  tagline: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  accent: 'neutral' | 'light-orange' | 'pink'
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    tagline: 'Perfect for trying out voice dictation.',
    description: 'Start speaking instead of typing — no commitment required.',
    features: [
      '4,000 words per week',
      'Basic AI formatting',
      '1 style profile',
      'macOS app',
      '90+ languages supported',
      'Local on-device processing',
      'Works in any app',
    ],
    cta: 'Get Started',
    accent: 'neutral',
  },
  {
    name: 'Pro',
    price: { monthly: 12, annual: 8 },
    tagline: 'For professionals who rely on voice daily.',
    description: 'Unlock your full potential with unlimited dictation.',
    features: [
      'Unlimited words',
      'Advanced AI formatting',
      'Unlimited style profiles',
      'Custom dictionary',
      'Priority support',
      'Early access to new features',
      'Advanced punctuation controls',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    accent: 'light-orange',
  },
  {
    name: 'Team (5+)',
    price: null,
    tagline: 'For companies with 5 or more employees.',
    description: 'Better pricing, shared management, and dedicated onboarding.',
    features: [
      'Everything in Pro',
      'Team management dashboard',
      'Shared style profiles',
      'Usage analytics',
      'SSO integration',
      'Dedicated support',
      'Volume discounts',
    ],
    cta: 'Contact Us',
    accent: 'pink',
  },
]

export interface FAQ {
  question: string
  answer: string
}

export const faqs: FAQ[] = [
  {
    question: 'How does the free plan work?',
    answer:
      'The free plan gives you 4,000 words per week of voice dictation. Your word count resets every Monday. No credit card required to get started.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your subscription at any time. You\'ll continue to have access to your plan until the end of your billing period.',
  },
  {
    question: 'Is my voice data private?',
    answer:
      'Absolutely. All audio processing happens locally on your Mac. Your voice data never leaves your device and is deleted immediately after transcription.',
  },
  {
    question: 'What apps does Anna work with?',
    answer:
      'Anna works with any app where you can type — browsers, code editors, email clients, Slack, Notion, and more. If you can put a cursor there, Anna can type there.',
  },
  {
    question: 'Do I need an internet connection?',
    answer:
      'Anna uses a local AI model for transcription, so basic dictation works offline. AI formatting and style profiles require an internet connection for the best results.',
  },
  {
    question: 'What\'s the difference between monthly and annual billing?',
    answer:
      'Annual billing saves you about 33% compared to monthly. You\'re billed once per year instead of monthly.',
  },
]
