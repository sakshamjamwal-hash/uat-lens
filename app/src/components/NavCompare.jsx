import { motion, AnimatePresence } from 'framer-motion'
import Reveal from './Reveal.jsx'
import AnnotationLayer from './AnnotationLayer.jsx'

function buildAnns(rows, on, numById) {
  return rows
    .filter(r => r.ann && r.ann.on === on && numById.has(r.id))
    .map(r => ({
      id: r.id,
      ref: numById.get(r.id), // sequential number — matches the table
      element: r.ann.element ?? r.cells[1],
      build: r.ann.build ?? r.cells[2],
      fix: r.fix,
      priority: r.cells[4],
      specialPriority: r.specialPriority,
      state: r.ann.state || 1, // 1-based capture state the pin belongs to
      x: r.ann.x,
      y: r.ann.y,
      w: r.ann.w,
      h: r.ann.h,
    }))
}

// A side is either a single capture (img/alt/node) or a list of mapped states.
function sideStates(side) {
  return Array.isArray(side.states) && side.states.length > 0
    ? side.states
    : [{ img: side.img, alt: side.alt, node: side.node, label: null }]
}

// Directional carousel: next → new slide enters from the right while the
// current one exits to the left; prev → mirrored. `custom` carries the click
// direction so the exiting slide animates with the CURRENT direction too.
const SLIDE = {
  enter: dir => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: dir => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0.4 }),
}

function Pane({ kind, side, anns, stateIdx, stateCount, onStateChange, direction, highlightId, onLightbox, pinsOn, soloId, onTogglePins }) {
  const states = sideStates(side)
  const multi = states.length > 1
  // Clamp: a single-state side keeps showing its one capture while the shared
  // index walks the other side's states.
  const idx = Math.min(stateIdx, states.length - 1)
  const current = states[idx]
  // Pins are state-scoped only on multi-state sides; a static side keeps all.
  const paneAnns = multi ? anns.filter(a => a.state - 1 === idx) : anns
  // Visibility: hidden by default → counter shows all → row-jump solos one.
  const visibleAnns = soloId != null
    ? paneAnns.filter(a => a.id === soloId)
    : (pinsOn ? paneAnns : [])

  return (
    <div className="pane">
      <div className="ph">
        <div className="pw">
          <span className="dot" />
          <span className="t">{kind === 'live' ? 'Build' : 'Design'}</span>
          <span className="src">{kind === 'live' ? 'Web' : 'Figma'}</span>
        </div>
        <span className="pv">{current.node ?? side.node}</span>
      </div>
      <div className="browser">
        <div className="bbar">
          <span className="traf"><i /><i /><i /></span>
          <span className="url">{side.url}</span>
        </div>
        <div className="screen-full">
          <div className="state-viewport">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.div
                key={idx}
                className="state-slide"
                custom={direction}
                variants={SLIDE}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.32, 0.72, 0.25, 1] }}
              >
                <AnnotationLayer
                  image={current.img}
                  alt={current.alt}
                  annotations={visibleAnns}
                  highlightId={highlightId}
                  onImageClick={() => onLightbox && onLightbox(current.img, current.alt, visibleAnns)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          {paneAnns.length > 0 && (
            <button
              className={`gap-counter${pinsOn && soloId == null ? ' gap-counter--on' : ''}`}
              onClick={onTogglePins}
              title={pinsOn && soloId == null ? 'Hide gap pins' : 'Show all gap pins'}
            >
              <span className="gap-counter-num">{paneAnns.length}</span>
              {paneAnns.length === 1 ? 'gap' : 'gaps'}
            </button>
          )}
          {multi && (
            <>
              <button
                className="state-nav state-nav--prev"
                disabled={stateIdx === 0}
                onClick={() => onStateChange(stateIdx - 1)}
                aria-label="Previous state"
              >‹</button>
              <button
                className="state-nav state-nav--next"
                disabled={stateIdx === stateCount - 1}
                onClick={() => onStateChange(stateIdx + 1)}
                aria-label="Next state"
              >›</button>
              <span className="state-ind mono">
                {idx + 1} / {states.length}{current.label ? ` · ${current.label}` : ''}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NavCompare({ compare, rows, tableKey, deletedRows = {}, addedRows = {}, onLightbox, highlightId, stateIdx = 0, direction = 1, onStateChange, pinsOn = true, soloId = null, onTogglePins }) {
  // Same visible ordering the table uses, so annotation numbers always match
  const visible = [
    ...rows.filter(r => !deletedRows[`${tableKey}:${r.id}`]),
    ...(addedRows[tableKey] || []),
  ]
  const numById = new Map(visible.map((r, i) => [r.id, i + 1]))

  const figmaAnns = buildAnns(rows, 'figma', numById)
  const liveAnns = buildAnns(rows, 'live', numById)

  // ONE shared index drives both panes: with N states on each side they slide
  // in sync (state k in Figma always faces state k in Build); a single-capture
  // side simply stays put. Direction comes from the navigation event itself.
  const stateCount = Math.max(sideStates(compare.live).length, sideStates(compare.figma).length)

  const common = { stateIdx, stateCount, onStateChange, direction, highlightId, onLightbox, pinsOn, soloId, onTogglePins }

  return (
    <Reveal as="section" className="scene" y={20} delay={0.05}>
      <div className="sm">
        <div className="lbl">
          <span className="desc">{compare.desc}</span>
        </div>
        <span className="stag">{compare.tag}</span>
      </div>

      <div className="compare">
        <Pane kind="live" side={compare.live} anns={liveAnns} {...common} />
        <Pane kind="figma" side={compare.figma} anns={figmaAnns} {...common} />
      </div>
    </Reveal>
  )
}
