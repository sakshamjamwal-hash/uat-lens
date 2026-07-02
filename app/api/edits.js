// Vercel serverless function — ONE shared edit store (not a new file per save).
//   GET  /api/edits  → returns the saved { edits, deletedRows, addedRows } (public read)
//   POST /api/edits  → OVERWRITES the same store (requires correct admin password)
//
// Production: persists to a single Vercel Blob object "uat-edits.json".
//   Needs env var BLOB_READ_WRITE_TOKEN (auto-added when you create a Blob store).
// Local / no-token: falls back to a temp JSON file so `vercel dev` still works.
import { put, list } from '@vercel/blob'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BLOB_KEY = 'uat-edits.json'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pabothegreat'
const HAS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN
const TMP_FILE = join(tmpdir(), 'uat-edits.json')
const EMPTY = { edits: {}, deletedRows: {}, addedRows: {} }

function shape(data) {
  return {
    edits: (data && data.edits) || {},
    deletedRows: (data && data.deletedRows) || {},
    addedRows: (data && data.addedRows) || {},
    updatedAt: (data && data.updatedAt) || null,
  }
}

async function readStore() {
  if (HAS_BLOB) {
    const { blobs } = await list({ prefix: BLOB_KEY })
    const blob = blobs.find(b => b.pathname === BLOB_KEY)
    if (!blob) return EMPTY
    const resp = await fetch(`${blob.url}?t=${Date.now()}`, { cache: 'no-store' })
    if (!resp.ok) return EMPTY
    return shape(await resp.json())
  }
  // local fallback
  try {
    return shape(JSON.parse(await readFile(TMP_FILE, 'utf8')))
  } catch {
    return EMPTY
  }
}

async function writeStore(payloadObj) {
  const payload = JSON.stringify(payloadObj)
  if (HAS_BLOB) {
    await put(BLOB_KEY, payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,   // ← keep the SAME object, no new file
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    })
    return
  }
  await writeFile(TMP_FILE, payload, 'utf8')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json(await readStore())
    } catch {
      return res.status(200).json(EMPTY) // never hard-fail reads
    }
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const { password, edits, deletedRows, addedRows } = body || {}
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      await writeStore({
        edits: edits || {},
        deletedRows: deletedRows || {},
        addedRows: addedRows || {},
        updatedAt: new Date().toISOString(),
      })
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
