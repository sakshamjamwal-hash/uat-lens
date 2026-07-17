import { useState, useCallback, useRef, useEffect } from 'react'
import { TABS } from './data/gaps.js'
import Reveal from './components/Reveal.jsx'

import TopStrip from './components/TopStrip.jsx'
import Hero from './components/Hero.jsx'
import StatCards from './components/StatCards.jsx'
import TabNav from './components/TabNav.jsx'
import Overview from './components/Overview.jsx'
import NavAudit from './components/NavAudit.jsx'
import PairView from './components/PairView.jsx'
import SceneTab from './components/SceneTab.jsx'
import EditBar from './components/EditBar.jsx'
import UndoToast from './components/UndoToast.jsx'
import Lightbox from './components/Lightbox.jsx'
import PasswordModal from './components/PasswordModal.jsx'
import EmptyState from './components/EmptyState.jsx'

const LOCAL_KEY = 'uat-state'

// No built-in dataset — meta/tabs come from public/uat-data.json at runtime.
const DEFAULT_META = null

function loadLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
    return { edits: s.edits || {}, deletedRows: s.deletedRows || {}, addedRows: s.addedRows || {} }
  } catch {
    return { edits: {}, deletedRows: {}, addedRows: {} }
  }
}

function saveLocal(state) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)) } catch {}
}

// Tally severities straight from the rows so the stat tiles always match the
// tables — including admin adds/deletes. Severity is the last cell; anything
// that isn't C/H/M/L counts as Verify.
export function computeStats(tabs) {
  const s = { total: 0, critical: 0, major: 0, minor: 0, verify: 0 }
  for (const tab of tabs || []) {
    if (!tab.block || !Array.isArray(tab.block.rows)) continue
    for (const row of tab.block.rows) {
      s.total++
      const sev = String((row.cells && row.cells[row.cells.length - 1]) || '').trim().toUpperCase()
      if (sev === 'C') s.critical++
      else if (sev === 'H') s.major++
      else if (sev === 'M' || sev === 'L') s.minor++
      else s.verify++
    }
  }
  return s
}

// Apply the admin edit overlay to a deep-cloned { meta, tabs } — this merged
// document is what Save posts to /api/data as the new canonical report.
function buildMergedData(meta, tabs, edits, deletedRows, addedRows) {
  const clone = JSON.parse(JSON.stringify({ meta: meta || {}, tabs: tabs || [] }))
  for (const tab of clone.tabs) {
    if (!tab.block || !Array.isArray(tab.block.rows)) continue
    const tableKey = `${tab.id}:gaps`
    // 1. drop deleted rows
    tab.block.rows = tab.block.rows.filter(r => !deletedRows[`${tableKey}:${r.id}`])
    // 2. append added rows for this table
    const added = (addedRows && addedRows[tableKey]) || []
    tab.block.rows.push(...JSON.parse(JSON.stringify(added)))
    // 3. apply cell / sev / fix edits
    for (const row of tab.block.rows) {
      const base = `${tableKey}:${row.id}`
      if (!Array.isArray(row.cells)) row.cells = []
      for (const [key, value] of Object.entries(edits)) {
        if (!key.startsWith(base + ':')) continue
        const suffix = key.slice(base.length + 1)
        if (suffix === 'sev') {
          row.cells[row.cells.length - 1] = value
        } else if (suffix === 'fix') {
          row.fix = value
        } else {
          const ci = Number(suffix)
          if (!Number.isNaN(ci)) row.cells[ci] = value
        }
      }
    }
  }
  // Re-tally so a saved report never ships stats that disagree with its rows.
  clone.meta.stats = computeStats(clone.tabs)
  return clone
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('uat-tab') || 'overview' }
    catch { return 'overview' }
  })

  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('uat-admin') === '1')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const adminPwRef = useRef(null)
  const pendingSaveRef = useRef(false)

  const initial = loadLocal()
  const [edits, setEdits] = useState(initial.edits)
  const [deletedRows, setDeletedRows] = useState(initial.deletedRows)
  const [addedRows, setAddedRows] = useState(initial.addedRows)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')

  // Undo toast state
  const [undoVisible, setUndoVisible] = useState(false)
  const [undoMessage, setUndoMessage] = useState('')
  const undoFnRef = useRef(null)

  // Lightbox state
  const [lightbox, setLightbox] = useState(null)

  // ── Imported-mode state ──
  // tabs/meta start empty; populated if public/uat-data.json is found at runtime.
  const [tabs, setTabs] = useState(TABS)
  const [meta, setMeta] = useState(DEFAULT_META)

  // ── Load the canonical document (backend first, static file fallback) ──
  // /api/data is the ONE report everyone shares; Save overwrites it in place.
  // Unsaved local drafts (localStorage overlay) survive reloads on top of it.
  useEffect(() => {
    let cancelled = false
    const apply = (data) => {
      if (cancelled || !data || !Array.isArray(data.tabs) || data.tabs.length === 0) return false
      setTabs(data.tabs)
      setMeta({ ...data.meta, tabCount: data.tabs.length })
      // If the persisted active tab isn't in the imported set, jump to the first.
      setActiveTab(prev => (data.tabs.some(t => t.id === prev) ? prev : data.tabs[0].id))
      return true
    }
    fetch('/api/data')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => {
        if (cancelled) return
        if (apply(data)) return
        // No backend (plain static hosting) — read the baked-in report
        return fetch('/uat-data.json')
          .then(r => (r.ok ? r.json() : null))
          .then(apply)
          .catch(() => { /* absent/offline: stay in empty state */ })
      })
    return () => { cancelled = true }
  }, [])

  // Keep a local draft cache in sync
  function persistLocal(nextEdits, nextDeleted, nextAdded) {
    saveLocal({
      edits: nextEdits ?? edits,
      deletedRows: nextDeleted ?? deletedRows,
      addedRows: nextAdded ?? addedRows,
    })
  }

  function handleAdminToggle() {
    if (isAdmin) {
      localStorage.removeItem('uat-admin')
      adminPwRef.current = null
      setIsAdmin(false)
    } else {
      setShowPasswordModal(true)
    }
  }

  function handlePasswordSubmit(pw) {
    if (pw === 'pabothegreat') {
      localStorage.setItem('uat-admin', '1')
      adminPwRef.current = pw
      setIsAdmin(true)
      setShowPasswordModal(false)
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        // run the deferred save now that we have the password
        setTimeout(() => doSave(pw), 0)
      }
      return true
    }
    return false
  }

  function handleTabChange(id) {
    setActiveTab(id)
    try { sessionStorage.setItem('uat-tab', id) } catch {}
  }

  function showUndo(message, fn) {
    undoFnRef.current = fn
    setUndoMessage(message)
    setUndoVisible(false)
    requestAnimationFrame(() => setUndoVisible(true))
  }

  const handleEdit = useCallback((key, value) => {
    setEdits(prev => {
      const next = { ...prev, [key]: value }
      persistLocal(next)
      return next
    })
    setDirty(true)
    setSaveStatus('idle')
    showUndo('Edit undone', () => {
      setEdits(prev => {
        const next = { ...prev }
        delete next[key]
        persistLocal(next)
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, deletedRows, addedRows])

  const handleDelete = useCallback((rowKey, isNew) => {
    if (isNew) {
      // rowKey here is `${tableKey}:${rowId}` — strip to find which table/row
      setAddedRows(prev => {
        const next = {}
        for (const [tk, rows] of Object.entries(prev)) {
          next[tk] = rows.filter(r => `${tk}:${r.id}` !== rowKey)
        }
        persistLocal(undefined, undefined, next)
        return next
      })
      setDirty(true)
      setSaveStatus('idle')
      return
    }
    setDeletedRows(prev => {
      const next = { ...prev, [rowKey]: true }
      persistLocal(undefined, next)
      return next
    })
    setDirty(true)
    setSaveStatus('idle')
    showUndo('Row deleted', () => {
      setDeletedRows(prev => {
        const next = { ...prev }
        delete next[rowKey]
        persistLocal(undefined, next)
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, deletedRows, addedRows])

  const handleAddRow = useCallback((tableKey, colCount) => {
    const id = `new-${Date.now()}-${Math.round(performance.now())}`
    setAddedRows(prev => {
      const rows = prev[tableKey] || []
      const next = { ...prev, [tableKey]: [...rows, { id, cells: Array(colCount).fill(''), fix: '' }] }
      persistLocal(undefined, undefined, next)
      return next
    })
    setDirty(true)
    setSaveStatus('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, deletedRows, addedRows])

  async function doSave(pwOverride) {
    const password = pwOverride || adminPwRef.current
    if (!password) {
      // No password in memory (e.g. after a reload) — ask for it, then save
      pendingSaveRef.current = true
      setShowPasswordModal(true)
      return
    }
    setSaveStatus('saving')
    setSaveError('')
    // Bake the draft overlay into the full document and overwrite the ONE
    // canonical json in place. No overlay store, no download.
    const merged = buildMergedData(meta, tabs, edits, deletedRows, addedRows)
    let postedToBackend = false
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data: merged }),
      })
      if (res.status === 401) {
        setSaveStatus('error')
        setSaveError('Wrong password — re-enter admin')
        return
      }
      postedToBackend = res.ok
    } catch {
      // network failure — handled below, draft stays local
    }
    if (postedToBackend) {
      // The canonical doc now IS the merged report — adopt it as the new base
      // and clear the draft overlay (it's baked in).
      setTabs(merged.tabs)
      setMeta({ ...merged.meta, tabCount: merged.tabs.length })
      setEdits({})
      setDeletedRows({})
      setAddedRows({})
      saveLocal({ edits: {}, deletedRows: {}, addedRows: {} })
      setDirty(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
      return
    }
    // No backend reachable — keep the draft locally, never download files.
    setSaveStatus('error')
    setSaveError('Save backend unreachable — your changes are kept as a local draft; retry when back online')
  }

  function handleSave() { doSave() }

  function handleCancel() {
    if (!dirty || confirm('Discard unsaved changes?')) {
      // Drop the local draft — the canonical document is untouched by drafts
      setEdits({})
      setDeletedRows({})
      setAddedRows({})
      saveLocal({ edits: {}, deletedRows: {}, addedRows: {} })
      setDirty(false)
      setSaveStatus('idle')
    }
  }

  function handleUndo() {
    if (undoFnRef.current) {
      undoFnRef.current()
      undoFnRef.current = null
    }
    setUndoVisible(false)
  }

  const editState = edits

  // Live stats — tallied from the merged rows (base data + admin overlay) so
  // the tiles and footer always agree with what the tables actually list.
  const liveStats = computeStats(buildMergedData(meta, tabs, edits, deletedRows, addedRows).tabs)

  const tabData = tabs.find(t => t.id === activeTab) || tabs[0]

  function renderTab() {
    if (!tabData) return null
    const common = {
      tab: tabData,
      editState,
      deletedRows,
      addedRows,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onAddRow: handleAddRow,
      isAdmin,
    }
    // Imported (converted) data: every tab is a Figma↔Build pair.
    if (tabData.kind === 'pair') {
      return <PairView {...common} onLightbox={(src, alt, annotations) => setLightbox({ src, alt, annotations })} />
    }
    switch (tabData.id) {
      case 'overview':
        return <Overview {...common} />
      case 'nav':
        return <NavAudit {...common} onLightbox={(src, alt, annotations) => setLightbox({ src, alt, annotations })} />
      default:
        return <SceneTab {...common} onLightbox={(src, alt) => setLightbox({ src, alt })} />
    }
  }

  return (
    <>
      <TopStrip isAdmin={isAdmin} onAdminToggle={handleAdminToggle} />
      <main>
        {tabs.length === 0 ? (
          <>
            <EmptyState />
            <footer className="footer">
              <div className="fl">UAT Lens · Design QA</div>
              <div className="fr">
                <span className="mono">FIGMA ↔ BUILD</span>
              </div>
            </footer>
          </>
        ) : (
          <>
            <div className="hero-row">
              <Hero meta={meta} stats={liveStats} />
              <StatCards stats={liveStats} />
            </div>
            <TabNav activeTab={activeTab} onTabChange={handleTabChange} tabs={tabs} />
            <Reveal key={activeTab} className="tab-pane" y={8} duration={0.32}>
              {renderTab()}
            </Reveal>
            {meta ? (
              <footer className="footer">
                <div className="fl">
                  {meta.title ? <>{meta.title} · Design UAT</> : 'UAT Lens · Design QA'}{meta.figmaKey ? <> · Figma <code>{meta.figmaKey}</code></> : null}{meta.generatedAt ? ` · ${meta.generatedAt}` : ''}
                </div>
                <div className="fr">
                  <span className="mono">
                    {tabs.length} PAIRS · {liveStats.total} GAPS · {liveStats.critical}C · {liveStats.major}H · {liveStats.minor}M · {liveStats.verify} VERIFY
                  </span>
                </div>
              </footer>
            ) : (
              <footer className="footer">
                <div className="fl">UAT Lens · Design QA</div>
                <div className="fr">
                  <span className="mono">{tabs.length} PAIRS</span>
                </div>
              </footer>
            )}
          </>
        )}
      </main>

      {isAdmin && (
        <EditBar
          dirty={dirty}
          status={saveStatus}
          error={saveError}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
      {isAdmin && (
        <UndoToast
          message={undoMessage}
          visible={undoVisible}
          onUndo={handleUndo}
          onDismiss={() => setUndoVisible(false)}
        />
      )}
      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} annotations={lightbox.annotations} onClose={() => setLightbox(null)} />
      )}
      {showPasswordModal && (
        <PasswordModal
          onSubmit={handlePasswordSubmit}
          onClose={() => { pendingSaveRef.current = false; setShowPasswordModal(false) }}
        />
      )}
    </>
  )
}
