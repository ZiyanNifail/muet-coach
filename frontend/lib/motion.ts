import type { Variants, Transition } from 'framer-motion'

export const easings = {
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
}

export const springs: Record<string, Transition> = {
  default: { type: 'spring', stiffness: 300, damping: 30 },
  gentle: { type: 'spring', stiffness: 200, damping: 25 },
  snappy: { type: 'spring', stiffness: 400, damping: 35 },
  bouncy: { type: 'spring', stiffness: 350, damping: 20 },
  slow: { type: 'spring', stiffness: 120, damping: 20 },
}

export const durations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.fast, ease: easings.in },
  },
}

export const springPop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.fast, ease: easings.in },
  },
}

export const backdropFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.base } },
  exit: { opacity: 0, transition: { duration: durations.base } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
}

export const toastSlide: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springs.snappy },
  exit: { opacity: 0, y: 4, scale: 0.97, transition: { duration: durations.fast } },
}

export const accordionHeight: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: springs.gentle,
  },
}
