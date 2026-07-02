import { useEffect, useRef } from 'react'

export default function UndoToast({ message, visible, onUndo, onDismiss }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (visible) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onDismiss()
      }, 3000)
    }
    return () => clearTimeout(timerRef.current)
  }, [visible, message, onDismiss])

  return (
    <div className={`undo-toast${visible ? ' visible' : ''}`}>
      <span className="undo-label">{message}</span>
      <button
        className="undo-btn"
        onClick={() => {
          clearTimeout(timerRef.current)
          onUndo()
        }}
      >
        UNDO
      </button>
      <div className="undo-bar" key={`${visible}-${message}`} />
    </div>
  )
}
