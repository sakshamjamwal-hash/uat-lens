// Vercel serverless function — the CANONICAL report document.
//   GET  /api/data  → returns the current { meta, tabs } (public read)
//   POST /api/data  → replaces the document with the full merged report
//                     (requires the admin password)
//
// This is the single source of truth for the deployed dashboard: Save in the
// Admin UI posts the complete merged JSON here, so edits/additions/deletions
// mutate ONE document in place — no overlay store, no downloads — and the
// document survives app redeploys.
//
// Storage detail: each save writes a NEW versioned blob (data/<timestamp>.json)
// and GET reads the newest. Overwriting a single blob pathname is NOT
// read-after-write consistent (the blob CDN can serve stale content for up to
// a minute), which would make a save look lost on a quick reload. Fresh
// object = fresh URL = immediate reads. The last KEEP_VERSIONS saves are kept
// as history; older ones are pruned.
import { put, list, del } from '@vercel/blob'

const PREFIX = 'uat-lens/data/'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pabothegreat'
const KEEP_VERSIONS = 10

async function listVersions() {
  const { blobs } = await list({ prefix: PREFIX })
  // pathnames are data/<epoch-ms>.json → lexicographic sort ≅ chronological
  return blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    try {
      const versions = await listVersions()
      const newest = versions[versions.length - 1]
      if (newest) {
        const resp = await fetch(`${newest.url}?t=${Date.now()}`, { cache: 'no-store' })
        if (resp.ok) return res.status(200).json(await resp.json())
      }
      // Not seeded yet — serve the static report from this deployment
      const host = req.headers['x-forwarded-host'] || req.headers.host
      const proto = req.headers['x-forwarded-proto'] || 'https'
      const fallback = await fetch(`${proto}://${host}/uat-data.json`, { cache: 'no-store' })
      if (fallback.ok) return res.status(200).json(await fallback.json())
      return res.status(404).json({ error: 'No report found' })
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) })
    }
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const { password, data } = body || {}
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!data || !data.meta || !Array.isArray(data.tabs) || data.tabs.length === 0) {
      return res.status(400).json({ error: 'Invalid document — expected { meta, tabs[] }' })
    }
    try {
      const pathname = `${PREFIX}${String(Date.now()).padStart(15, '0')}.json`
      await put(pathname, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      })
      // prune old versions, keep the newest KEEP_VERSIONS as history
      try {
        const versions = await listVersions()
        const stale = versions.slice(0, Math.max(0, versions.length - KEEP_VERSIONS))
        if (stale.length) await del(stale.map(b => b.url))
      } catch { /* pruning is best-effort */ }
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() })
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
