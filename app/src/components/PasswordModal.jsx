import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { scrim, pop } from '../motion.js'

export default function PasswordModal({ onSubmit, onClose }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    const result = onSubmit(pw)
    if (result === false) {
      setError('Incorrect password')
      setPw('')
      inputRef.current?.focus()
    }
  }

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        zIndex: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
      variants={scrim}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          padding: '32px 28px',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={e => e.stopPropagation()}
        variants={pop}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
          Admin Access
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            ref={inputRef}
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError('') }}
            placeholder="Password"
            style={{
              background: 'var(--surface)',
              border: error ? '1px solid var(--danger)' : '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)',
              color: 'var(--fg)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              padding: '9px 12px',
              outline: 'none',
              width: '100%',
              transition: 'border-color .15s',
            }}
          />
          {error && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--danger)', letterSpacing: '.06em' }}>
              {error}
            </span>
          )}
          <button type="submit" style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            padding: '10px 16px',
            cursor: 'pointer',
          }}>
            Enter Admin
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
