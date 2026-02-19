import type { Variants, Transition } from 'framer-motion'

// MindMarket-style easing — smooth decel
export const ease = [0.4, 0, 0.2, 1] as const

export const transition: Transition = {
  duration: 0.8,
  ease,
}

export const transitionSlow: Transition = {
  duration: 1.2,
  ease,
}

// Big entrance — 80px translateY like mindmarket
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 80 },
  visible: {
    opacity: 1,
    y: 0,
    transition,
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition,
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitionSlow,
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

// For parallax scroll sections
export const parallaxUp = (distance: number = 60): Variants => ({
  hidden: { y: distance },
  visible: { y: -distance },
})
