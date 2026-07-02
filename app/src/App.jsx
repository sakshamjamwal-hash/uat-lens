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

// Apply the admin edit overlay to a deep-cloned { meta, tabs } so it can be
// downloaded and committed as the new public/uat-data.json.
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
  return clone
}

function triggerDownload(dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'uat-data.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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

  useEffect(() => {
    let cancelled = false
    fetch('/uat-data.json')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || !Array.isArray(data.tabs) || data.tabs.length === 0) return
        setTabs(data.tabs)
        setMeta({ ...data.meta, tabCount: data.tabs.length })
        // If the persisted active tab isn't in the imported set, jump to the first.
        setActiveTab(prev => (data.tabs.some(t => t.id === prev) ? prev : data.tabs[0].id))
      })
      .catch(() => { /* absent/offline: stay in empty state */ })
    return () => { cancelled = true }
  }, [])

  // ── Load the shared store on mount (source of truth for everyone) ──
  useEffect(() => {
    let cancelled = false
    fetch('/api/edits')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        // Don't clobber unsaved local admin edits mid-session
        if (dirty) return
        const next = {
          edits: data.edits || {},
          deletedRows: data.deletedRows || {},
          addedRows: data.addedRows || {},
        }
        setEdits(next.edits)
        setDeletedRows(next.deletedRows)
        setAddedRows(next.addedRows)
        saveLocal(next)
      })
      .catch(() => { /* local dev / offline: keep localStorage copy */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Best-effort POST to the optional shared store. If a backend is present
    // and rejects the password, surface that error and stop.
    let postedToBackend = false
    try {
      const res = await fetch('/api/edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, edits, deletedRows, addedRows }),
      })
      if (res.status === 401) {
        setSaveStatus('error')
        setSaveError('Wrong password — re-enter admin')
        return
      }
      postedToBackend = res.ok
    } catch {
      // no backend (local-first) — fall through to download
    }
    // Local-first: download the merged report so the user can replace
    // public/uat-data.json and commit/share it.
    try {
      triggerDownload(buildMergedData(meta, tabs, edits, deletedRows, addedRows))
      setDirty(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (e) {
      // If the download itself fails but the backend accepted, still count as saved.
      if (postedToBackend) {
        setDirty(false)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } else {
        setSaveStatus('error')
        setSaveError(e.message || 'Save failed')
      }
    }
  }

  function handleSave() { doSave() }

  function handleCancel() {
    if (!dirty || confirm('Discard unsaved changes?')) {
      // Re-pull the shared store
      fetch('/api/edits')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          const next = {
            edits: (data && data.edits) || {},
            deletedRows: (data && data.deletedRows) || {},
            addedRows: (data && data.addedRows) || {},
          }
          setEdits(next.edits)
          setDeletedRows(next.deletedRows)
          setAddedRows(next.addedRows)
          saveLocal(next)
          setDirty(false)
          setSaveStatus('idle')
        })
        .catch(() => {
          setDirty(false)
          setSaveStatus('idle')
        })
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
            <Hero meta={meta} />
            <StatCards meta={meta} />
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
                    {tabs.length} PAIRS · {meta.stats?.total ?? 0} GAPS · {meta.stats?.critical ?? 0}C · {meta.stats?.major ?? 0}H · {meta.stats?.minor ?? 0}M · {meta.stats?.needsVerify ?? 0} VERIFY
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
