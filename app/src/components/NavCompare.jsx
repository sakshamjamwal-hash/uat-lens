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
      x: r.ann.x,
      y: r.ann.y,
      w: r.ann.w,
      h: r.ann.h,
    }))
}

export default function NavCompare({ compare, rows, tableKey, deletedRows = {}, addedRows = {}, onLightbox, highlightId }) {
  // Same visible ordering the table uses, so annotation numbers always match
  const visible = [
    ...rows.filter(r => !deletedRows[`${tableKey}:${r.id}`]),
    ...(addedRows[tableKey] || []),
  ]
  const numById = new Map(visible.map((r, i) => [r.id, i + 1]))

  const figmaAnns = buildAnns(rows, 'figma', numById)
  const liveAnns = buildAnns(rows, 'live', numById)

  return (
    <Reveal as="section" className="scene" y={20} delay={0.05}>
      <div className="sm">
        <div className="lbl">
          <span className="desc">{compare.desc}</span>
        </div>
        <span className="stag">{compare.tag}</span>
      </div>

      <div className="compare">
        {/* Build pane (left) */}
        <div className="pane">
          <div className="ph">
            <div className="pw">
              <span className="dot" />
              <span className="t">Build</span>
              <span className="src">Web</span>
            </div>
            <span className="pv">{compare.live.node}</span>
          </div>
          <div className="browser">
            <div className="bbar">
              <span className="traf"><i /><i /><i /></span>
              <span className="url">{compare.live.url}</span>
            </div>
            <div className="screen-full">
              <AnnotationLayer
                image={compare.live.img}
                alt={compare.live.alt}
                annotations={liveAnns}
                highlightId={highlightId}
                onImageClick={() => onLightbox && onLightbox(compare.live.img, compare.live.alt, liveAnns)}
              />
            </div>
          </div>
        </div>

        {/* Figma pane (right) */}
        <div className="pane">
          <div className="ph">
            <div className="pw">
              <span className="dot" />
              <span className="t">Design</span>
              <span className="src">Figma</span>
            </div>
            <span className="pv">{compare.figma.node}</span>
          </div>
          <div className="browser">
            <div className="bbar">
              <span className="traf"><i /><i /><i /></span>
              <span className="url">{compare.figma.url}</span>
            </div>
            <div className="screen-full">
              <AnnotationLayer
                image={compare.figma.img}
                alt={compare.figma.alt}
                annotations={figmaAnns}
                highlightId={highlightId}
                onImageClick={() => onLightbox && onLightbox(compare.figma.img, compare.figma.alt, figmaAnns)}
              />
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
