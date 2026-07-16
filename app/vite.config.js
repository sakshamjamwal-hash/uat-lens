import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Dev-server twin of api/data.js: on localhost the canonical report IS
// public/uat-data.json — Save overwrites that same file in place, so admin
// edits persist to disk in real time (no download, no separate overlay).
const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), 'public', 'uat-data.json')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pabothegreat'

function canonicalDataStore() {
  return {
    name: 'uat-canonical-data-store',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          try { res.end(readFileSync(DATA_FILE, 'utf8')) }
          catch { res.statusCode = 404; res.end(JSON.stringify({ error: 'No report found' })) }
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { password, data } = JSON.parse(body || '{}')
              if (password !== ADMIN_PASSWORD) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Unauthorized' }))
                return
              }
              if (!data || !data.meta || !Array.isArray(data.tabs) || data.tabs.length === 0) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid document — expected { meta, tabs[] }' }))
                return
              }
              writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
              res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String((e && e.message) || e) }))
            }
          })
          return
        }
        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST')
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), canonicalDataStore()],
})
