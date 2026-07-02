import { motion } from 'framer-motion'

export default function TopStrip({ isAdmin, onAdminToggle }) {
  return (
    <div className="topstrip">
      <div className="side">
        <span className="dot" />
        <span className="mono">UAT<span className="sep">/</span>Lens</span>
      </div>
      <div className="side" style={{ gap: '16px' }}>
        <motion.button
          onClick={onAdminToggle}
          whileHover={{ y: -1, borderColor: 'var(--accent)', color: 'var(--accent)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            border: isAdmin ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: isAdmin ? 'var(--accent)' : 'var(--fg-dim)',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            padding: '5px 12px',
            borderRadius: 'var(--r-xl)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {isAdmin ? 'Exit Admin' : 'Admin'}
        </motion.button>
      </div>
    </div>
  )
}
