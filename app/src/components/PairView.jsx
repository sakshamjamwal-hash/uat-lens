import { useState, useRef, useCallback } from 'react'
import SectionHeader from './SectionHeader.jsx'
import FindingsTable from './FindingsTable.jsx'
import NavCompare from './NavCompare.jsx'

// Column widths — same treatment NavAudit uses; gives the Fix column real room.
const PAIR_COL_WIDTHS = {
  '#': '40px',
  'Element': '16%',
  'Build': '23%',
  'Figma': '20%',
  'Priority': '88px',
  __fix: '27%',
}

export default function PairView({ tab, editState, deletedRows, addedRows, onEdit, onDelete, onAddRow, onLightbox, isAdmin }) {
  const block = tab.block
  const tableKey = `${tab.id}:gaps`
  const [highlightId, setHighlightId] = useState(null)
  const clearTimer = useRef(null)
  // Shared capture-state for the compare panes (multi-screenshot tabs).
  // Direction is recorded at navigation time — deriving it during render
  // breaks under React's dev double-render.
  const [stateNav, setStateNav] = useState({ idx: 0, dir: 1 })
  const changeState = useCallback((nextIdx) => {
    setStateNav(prev => ({ idx: nextIdx, dir: nextIdx >= prev.idx ? 1 : -1 }))
  }, [])

  // Pin visibility: hidden by default so the screenshot stays readable.
  // The gap counter toggles all pins; a table row-jump shows ONLY that pin.
  const [pinsOn, setPinsOn] = useState(false)
  const [soloId, setSoloId] = useState(null)
  const togglePins = useCallback(() => {
    setSoloId(prevSolo => {
      // leaving solo mode → show all; otherwise plain toggle
      if (prevSolo === null) setPinsOn(v => !v)
      else setPinsOn(true)
      return null
    })
  }, [])

  // Count what the table actually shows (base − deleted + added) so the chip
  // never disagrees with the rows, even mid-edit.
  const visibleCount =
    block.rows.filter(r => !deletedRows[`${tableKey}:${r.id}`]).length +
    ((addedRows && addedRows[tableKey]) || []).length

  // ids that have an image annotation → those rows are clickable-to-jump
  const annotatedIds = new Set(block.rows.filter(r => r.ann).map(r => r.id))

  const handleRowJump = useCallback((rowId) => {
    if (!annotatedIds.has(rowId)) return
    const compareEl = document.querySelector('.nav-audit .compare')
    if (compareEl) compareEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Slide the panes to the capture state this gap was marked on,
    // and show only this gap's pin
    const row = block.rows.find(r => r.id === rowId)
    if (row?.ann?.state) changeState(Math.max(0, row.ann.state - 1))
    setSoloId(rowId)
    setHighlightId(rowId)
    clearTimeout(clearTimer.current)
    clearTimer.current = setTimeout(() => setHighlightId(null), 2200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.rows])

  return (
    <div className="nav-audit">
      <SectionHeader idx={tab.sectionHeader.idx} title={tab.sectionHeader.title} />

      <NavCompare
        compare={tab.compare}
        rows={block.rows}
        tableKey={tableKey}
        deletedRows={deletedRows}
        addedRows={addedRows}
        onLightbox={onLightbox}
        highlightId={highlightId}
        stateIdx={stateNav.idx}
        direction={stateNav.dir}
        onStateChange={changeState}
        pinsOn={pinsOn}
        soloId={soloId}
        onTogglePins={togglePins}
      />

      <div className="block">
        <div className="bh">
          <h3>{block.header}</h3>
          <span className="cnt">{visibleCount} {visibleCount === 1 ? 'gap' : 'gaps'}</span>
        </div>
        <FindingsTable
          block={block}
          tableKey={tableKey}
          editState={editState}
          deletedRows={deletedRows}
          addedRows={addedRows}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRow={onAddRow}
          isAdmin={isAdmin}
          colWidths={PAIR_COL_WIDTHS}
          onRowJump={handleRowJump}
          jumpableIds={annotatedIds}
        />
      </div>
    </div>
  )
}
