const SEV_MAP = { C: 'Critical', H: 'High', M: 'Medium', L: 'Low' }
const SEV_RMAP = { Critical: 'sev-C', High: 'sev-H', Medium: 'sev-M', Low: 'sev-L' }

function PrioritySelect({ value, special, onChange }) {
  if (special) return <span className="sev sev-M">{special}</span>

  const displayVal = SEV_MAP[value] || value || 'Medium'
  const cls = SEV_RMAP[displayVal] || ''

  if (!value || value === '—') {
    return <span style={{ color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>—</span>
  }

  return (
    <select
      className={`sev-select ${cls}`}
      value={displayVal}
      onChange={e => onChange(e.target.value)}
    >
      {['Critical', 'High', 'Medium', 'Low', '—'].map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  )
}

// Detect which column index is the priority column
function isPriorityCol(cols, ci) {
  const c = (cols[ci] || '').toLowerCase()
  return c === 'priority'
}

// Detect element/gap column
function isElementCol(cols, ci) {
  const c = (cols[ci] || '').toLowerCase()
  return c === 'element' || c === 'gap' || c === 'issue'
}

// Detect note-style column
function isNoteCol(cols, ci) {
  const c = (cols[ci] || '').toLowerCase()
  return c === 'impact'
}

export default function FindingsTable({ block, tableKey, editState, deletedRows = {}, addedRows = {}, onEdit, onDelete, onAddRow, isAdmin, colWidths, onRowJump, jumpableIds }) {
  const cols = block.columns
  const jumpSet = jumpableIds || new Set()

  const extraRows = addedRows[tableKey] || []
  // Hide rows the admin has deleted (persisted). Added rows are always shown.
  const baseRows = block.rows.filter(row => !deletedRows[`${tableKey}:${row.id}`])
  const allRows = [...baseRows, ...extraRows]

  return (
    <div className="findings">
      <table className={colWidths ? 'ft-fixed' : ''}>
        {colWidths && (
          <colgroup>
            {cols.map((c, i) => <col key={i} style={colWidths[c] ? { width: colWidths[c] } : undefined} />)}
            <col style={colWidths.__fix ? { width: colWidths.__fix } : undefined} />
            {isAdmin && <col style={{ width: '30px' }} />}
          </colgroup>
        )}
        <thead>
          <tr>
            {cols.map(c => <th key={c}>{c}</th>)}
            <th className="col-fix">Fix</th>
            {isAdmin && <th className="col-act" />}
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, rowIndex) => {
            const rowKey = `${tableKey}:${row.id}`
            // Serial number is always derived from visible position — auto-rectifies on add/delete
            const serial = rowIndex + 1
            return (
              <tr key={row.id}>
                {row.cells.map((cell, ci) => {
                  const cellKey = `${rowKey}:${ci}`
                  const val = editState[cellKey] !== undefined ? editState[cellKey] : cell

                  // "#" column — sequential serial, clickable to jump to its annotation
                  if ((cols[ci] || '') === '#') {
                    const jumpable = onRowJump && jumpSet.has(row.id)
                    return (
                      <td key={ci} className="num-cell">
                        {jumpable
                          ? <button className="row-jump" title="Show on screenshot" onClick={() => onRowJump(row.id)}>{serial}</button>
                          : <span>{serial}</span>}
                      </td>
                    )
                  }

                  if (isPriorityCol(cols, ci)) {
                    const sevVal = editState[`${rowKey}:sev`] !== undefined ? editState[`${rowKey}:sev`] : cell
                    const isCatCol = (cols[ci] || '').toLowerCase() === 'category'
                    if (isCatCol) {
                      return (
                        <td key={ci}>
                          <span className="sev-rpt">{val}</span>
                        </td>
                      )
                    }
                    // In admin mode render editable select; in normal mode render badge
                    if (!isAdmin) {
                      const displayVal = SEV_MAP[sevVal] || sevVal || 'Medium'
                      const cls = SEV_RMAP[displayVal] || ''
                      if (row.specialPriority) {
                        return <td key={ci}><span className="sev sev-M">{row.specialPriority}</span></td>
                      }
                      if (!sevVal || sevVal === '—') {
                        return (
                          <td key={ci}>
                            <span style={{ color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>—</span>
                          </td>
                        )
                      }
                      return (
                        <td key={ci}>
                          <span className={`sev ${cls}`}>{displayVal}</span>
                        </td>
                      )
                    }
                    return (
                      <td key={ci}>
                        <PrioritySelect
                          value={sevVal}
                          special={row.specialPriority}
                          onChange={v => onEdit(`${rowKey}:sev`, v)}
                        />
                      </td>
                    )
                  }

                  const isCat = (cols[ci] || '').toLowerCase() === 'category'

                  if (!isAdmin) {
                    return (
                      <td
                        key={ci}
                        className={
                          isElementCol(cols, ci) ? 'el' :
                          isNoteCol(cols, ci) ? 'note' :
                          ''
                        }
                      >
                        {isCat ? <span className="sev-rpt">{val}</span> : val}
                      </td>
                    )
                  }

                  return (
                    <td
                      key={ci}
                      className={
                        isElementCol(cols, ci) ? 'el' :
                        isNoteCol(cols, ci) ? 'note' :
                        ''
                      }
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => onEdit(cellKey, e.currentTarget.textContent)}
                    >
                      {isCat ? (
                        <span className="sev-rpt">{val}</span>
                      ) : val}
                    </td>
                  )
                })}
                {isAdmin ? (
                  <td
                    className="fix-cell col-fix"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => onEdit(`${rowKey}:fix`, e.currentTarget.textContent)}
                  >
                    {editState[`${rowKey}:fix`] !== undefined
                      ? editState[`${rowKey}:fix`]
                      : (row.fix || '')}
                  </td>
                ) : (
                  <td className="fix-cell col-fix">
                    {editState[`${rowKey}:fix`] !== undefined
                      ? editState[`${rowKey}:fix`]
                      : (row.fix || '')}
                  </td>
                )}
                {isAdmin && (
                  <td className="row-act">
                    <button
                      className="del-row"
                      title="Delete"
                      onClick={() => onDelete(rowKey, row.id.startsWith('new-'))}
                    >×</button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        {isAdmin && (
          <tfoot>
            <tr>
              <td colSpan={cols.length + 2} className="add-row-cell">
                <button className="add-row-btn" onClick={() => onAddRow(tableKey, cols.length)}>+ Add gap</button>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
