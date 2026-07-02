import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { scrim, pop } from '../motion.js'
import AnnotationLayer from './AnnotationLayer.jsx'

export default function Lightbox({ src, alt, annotations, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!src) return null

  const hasAnns = annotations && annotations.length > 0

  return (
    <motion.div
      className="lb open"
      onClick={onClose}
      variants={scrim}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <button
        className="lb-x"
        aria-label="Close"
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        ×
      </button>
      <motion.div
        className="lb-wrap"
        onClick={e => e.stopPropagation()}
        variants={pop}
      >
        {hasAnns ? (
          <div className="lb-ann">
            <AnnotationLayer image={src} alt={alt} annotations={annotations} />
          </div>
        ) : (
          <img src={src} alt={alt || ''} onClick={onClose} />
        )}
      </motion.div>
    </motion.div>
  )
}
