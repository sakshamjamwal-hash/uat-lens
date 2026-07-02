// Shared Framer Motion variants & transitions — subtle, tasteful defaults.
// Respect prefers-reduced-motion via <MotionConfig reducedMotion="user"> in main.jsx.

export const EASE = [0.22, 0.61, 0.36, 1] // gentle ease-out

// Container that staggers its children on mount
export const stagger = (gap = 0.06, delay = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: gap, delayChildren: delay },
  },
})

// Fade + rise — the workhorse entrance
export const fadeUp = (y = 14, duration = 0.5) => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
})

// Soft fade only
export const fade = (duration = 0.4) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration, ease: EASE } },
})

// Tab pane swap — quick crossfade with a hair of vertical drift
export const tabSwap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE } },
}

// Modal / overlay scrim
export const scrim = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// Modal / lightbox card
export const pop = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.26, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.16, ease: EASE } },
}

// Spring for slide-in bars / toasts
export const springBar = { type: 'spring', stiffness: 380, damping: 32 }
