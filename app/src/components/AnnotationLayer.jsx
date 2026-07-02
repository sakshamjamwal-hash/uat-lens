import { useState } from 'react'

const SEV_ANN = { C: 'ann-C', H: 'ann-H', M: 'ann-M', L: 'ann-L' }
const SEV_CLASS = { C: 'sev-C', H: 'sev-H', M: 'sev-M', L: 'sev-L' }
const SEV_LABEL = { C: 'Critical', H: 'High', M: 'Medium', L: 'Low' }

export default function AnnotationLayer({ image, alt, annotations = [], onImageClick, highlightId }) {
  // Numbered pins are always visible at each gap; hovering a pin reveals that
  // gap's dotted outline AND an info card (build issue + fix + severity).
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="ann-layer">
      <img
        className="ann-img"
        src={image}
        alt={alt || ''}
        style={{ cursor: onImageClick ? 'zoom-in' : 'default' }}
        onClick={onImageClick}
      />

      {annotations.map((a, i) => {
        const sevCls = a.specialPriority ? 'ann-M' : (SEV_ANN[a.priority] || 'ann-M')
        const active = hoveredId === a.id || (highlightId && a.id === highlightId)
        const pulse = highlightId && a.id === highlightId ? ' ann-box--pulse' : ''
        // flip the card below the pin when the gap sits near the top edge
        const below = a.y < 16
        return (
          <div
            key={a.ref || i}
            className={`ann-box ${sevCls}${active ? ' ann-box--active' : ''}${pulse}`}
            style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
          >
            <span
              className="ann-num"
              onMouseEnter={() => setHoveredId(a.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {a.ref}
            </span>
            <div className={`ann-tip${below ? ' ann-tip--below' : ''}`}>
              <div className="ann-tip-head">
                <span className="ann-tip-ref">Gap {a.ref}</span>
                {a.specialPriority
                  ? <span className="sev sev-M">{a.specialPriority}</span>
                  : <span className={`sev ${SEV_CLASS[a.priority] || 'sev-M'}`}>{SEV_LABEL[a.priority] || a.priority}</span>}
              </div>
              {a.element && <div className="ann-tip-title">{a.element}</div>}
              {a.build && <div className="ann-tip-build">{a.build}</div>}
              {a.fix && <div className="ann-tip-fix"><strong>Fix:</strong> {a.fix}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
