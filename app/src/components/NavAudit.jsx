import { useState, useRef, useCallback } from 'react'
import SectionHeader from './SectionHeader.jsx'
import FindingsTable from './FindingsTable.jsx'
import NavCompare from './NavCompare.jsx'

// Column widths for the (wide) merged nav table — gives the Fix column real room.
const NAV_COL_WIDTHS = {
  '#': '40px',
  'Element': '16%',
  'Build': '23%',
  'Figma': '20%',
  'Priority': '88px',
  __fix: '27%',
}

export default function NavAudit({ tab, editState, deletedRows, addedRows, onEdit, onDelete, onAddRow, onLightbox, isAdmin }) {
  const block = tab.blocks[0]
  const [highlightId, setHighlightId] = useState(null)
  const clearTimer = useRef(null)

  // ids that have an image annotation → those rows are clickable-to-jump
  const annotatedIds = new Set(block.rows.filter(r => r.ann).map(r => r.id))

  const handleRowJump = useCallback((rowId) => {
    if (!annotatedIds.has(rowId)) return
    const compareEl = document.querySelector('.nav-audit .compare')
    if (compareEl) compareEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        tableKey="nav:gaps"
        deletedRows={deletedRows}
        addedRows={addedRows}
        onLightbox={onLightbox}
        highlightId={highlightId}
      />

      <div className="block">
        <div className="bh">
          <h3>{block.header}</h3>
          <span className="cnt">{block.count}</span>
        </div>
        <FindingsTable
          block={block}
          tableKey="nav:gaps"
          editState={editState}
          deletedRows={deletedRows}
          addedRows={addedRows}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRow={onAddRow}
          isAdmin={isAdmin}
          colWidths={NAV_COL_WIDTHS}
          onRowJump={handleRowJump}
          jumpableIds={annotatedIds}
        />
      </div>
    </div>
  )
}
