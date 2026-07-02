import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EASE } from '../motion.js'

// Entrance wrapper. Animates after mount via a state flip — viewport-independent
// and StrictMode-safe (unlike whileInView / mount-time animate).
//
// Safety: if the tab is hidden at mount (backgrounded, or an offscreen renderer
// where requestAnimationFrame is paused), we skip the enter animation and commit
// straight to the visible state via initial={false}, so content is never stuck
// at opacity 0 waiting for a frame loop that isn't running.
export default function Reveal({
  as = 'div',
  y = 16,
  delay = 0,
  duration = 0.5,
  className,
  style,
  children,
  ...rest
}) {
  const canAnimate = typeof document !== 'undefined' && !document.hidden
  const [shown, setShown] = useState(!canAnimate)

  useEffect(() => {
    if (!canAnimate) return
    const id = setTimeout(() => setShown(true), 20)
    return () => clearTimeout(id)
  }, [canAnimate])

  const M = motion[as] || motion.div
  return (
    <M
      className={className}
      style={style}
      initial={canAnimate ? { opacity: 0, y } : false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </M>
  )
}
