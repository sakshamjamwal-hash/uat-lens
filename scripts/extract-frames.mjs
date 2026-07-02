#!/usr/bin/env node
// extract-frames.mjs — pull frames from a screen recording for build capture.
// Usage:
//   node scripts/extract-frames.mjs <recording> [--interval 5] [--start 173] [--end 233] [--out DIR]
// Writes f_0000_t0000.jpg … into the output dir (default app/public/uat/frames).
// Requires ffmpeg on PATH.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const argv = process.argv.slice(2)
let src = null, interval = 5, start = null, end = null
let out = path.resolve('app/public/uat/frames')
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--interval') interval = Number(argv[++i])
  else if (a === '--start') start = Number(argv[++i])
  else if (a === '--end') end = Number(argv[++i])
  else if (a === '--out') out = path.resolve(argv[++i])
  else if (!src) src = a
}
if (!src) { console.error('Usage: node scripts/extract-frames.mjs <recording> [--interval 5] [--start s] [--end s] [--out DIR]'); process.exit(1) }
src = path.resolve(src)
if (!fs.existsSync(src)) { console.error('Not found: ' + src); process.exit(1) }
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) }
catch { console.error('ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg`).'); process.exit(1) }

fs.mkdirSync(out, { recursive: true })
// clear old frames
for (const f of fs.readdirSync(out)) if (/^f_\d+_t\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(out, f))

const args = ['-hide_banner', '-loglevel', 'error']
if (start != null) args.push('-ss', String(start))
args.push('-i', src)
if (end != null) args.push('-t', String(end - (start || 0)))
// one frame every `interval` seconds; label filenames with absolute seconds
const startOffset = start || 0
args.push('-vf', `fps=1/${interval}`, '-q:v', '3', path.join(out, '_tmp_%05d.jpg'))
execFileSync('ffmpeg', args, { stdio: 'inherit' })

// rename _tmp_00001.jpg → f_0000_t<seconds>.jpg
const tmp = fs.readdirSync(out).filter(f => /^_tmp_\d+\.jpg$/.test(f)).sort()
tmp.forEach((f, idx) => {
  const secs = startOffset + idx * interval
  const name = `f_${String(idx).padStart(4, '0')}_t${String(secs).padStart(4, '0')}.jpg`
  fs.renameSync(path.join(out, f), path.join(out, name))
})
console.log(`✓ ${tmp.length} frames → ${out} (every ${interval}s${start != null ? `, from ${start}s` : ''}${end != null ? ` to ${end}s` : ''})`)
console.log('View them, pick the frame matching each Figma screen, copy to app/public/uat/live-<n>.png')
