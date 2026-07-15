#!/usr/bin/env node
// extract-frames.mjs — pull frames from a screen recording for build capture.
// Usage:
//   node scripts/extract-frames.mjs <recording> [--interval 5] [--start 173] [--end 233] [--out DIR]
// Writes f_0000_t0000.jpg … into the output dir (default app/public/uat/frames).
// Uses ffmpeg if available; on macOS without ffmpeg, falls back to AVFoundation (swift).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
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

fs.mkdirSync(out, { recursive: true })
for (const f of fs.readdirSync(out)) if (/^f_\d+_t\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(out, f))

function hasFfmpeg() { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true } catch { return false } }
function hasSwift() { try { execFileSync('swift', ['--version'], { stdio: 'ignore' }); return true } catch { return false } }

if (hasFfmpeg()) {
  const args = ['-hide_banner', '-loglevel', 'error']
  if (start != null) args.push('-ss', String(start))
  args.push('-i', src)
  if (end != null) args.push('-t', String(end - (start || 0)))
  args.push('-vf', `fps=1/${interval}`, '-q:v', '3', path.join(out, '_tmp_%05d.jpg'))
  execFileSync('ffmpeg', args, { stdio: 'inherit' })
  const tmp = fs.readdirSync(out).filter(f => /^_tmp_\d+\.jpg$/.test(f)).sort()
  const startOffset = start || 0
  tmp.forEach((f, idx) => {
    const secs = startOffset + idx * interval
    fs.renameSync(path.join(out, f), path.join(out, `f_${String(idx).padStart(4, '0')}_t${String(secs).padStart(4, '0')}.jpg`))
  })
  console.log(`✓ ${tmp.length} frames (ffmpeg) → ${out}`)
} else if (process.platform === 'darwin' && hasSwift()) {
  // macOS fallback — AVFoundation via swift (no ffmpeg needed)
  const swift = `
import AVFoundation; import AppKit; import Foundation
let a = CommandLine.arguments
let src = a[1]; let interval = Double(a[2])!; let outDir = a[3]
let s0 = Double(a[4]) ?? -1; let e0 = Double(a[5]) ?? -1
let asset = AVURLAsset(url: URL(fileURLWithPath: src))
let sem = DispatchSemaphore(value: 0); var dur = 0.0
asset.loadValuesAsynchronously(forKeys: ["duration"]) { dur = CMTimeGetSeconds(asset.duration); sem.signal() }
sem.wait(); if dur <= 0 { dur = 3600 }
let lo = s0 >= 0 ? s0 : 0.0
let hi = e0 > 0 ? min(e0, dur) : dur
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let fm = FileManager.default; try? fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)
var t = lo, idx = 0, made = 0
while t < hi {
  let time = CMTime(seconds: t, preferredTimescale: 600)
  if let cg = try? gen.copyCGImage(at: time, actualTime: nil) {
    let rep = NSBitmapImageRep(cgImage: cg)
    if let d = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) {
      let name = String(format: "f_%04d_t%04d.jpg", idx, Int(t))
      try? d.write(to: URL(fileURLWithPath: outDir).appendingPathComponent(name)); made += 1
    }
  }
  idx += 1; t += interval
}
print("\\(made)")
`
  const tmpSwift = path.join(os.tmpdir(), `uatlens-frames-${Date.now()}.swift`)
  fs.writeFileSync(tmpSwift, swift)
  const madeStr = execFileSync('swift', [tmpSwift, src, String(interval), out, String(start ?? -1), String(end ?? -1)], { encoding: 'utf8' }).trim()
  fs.unlinkSync(tmpSwift)
  console.log(`✓ ${madeStr} frames (AVFoundation) → ${out}`)
} else {
  console.error('Neither ffmpeg nor swift (macOS) available. Install ffmpeg: `brew install ffmpeg`.')
  process.exit(1)
}
console.log('View them, pick the frame matching each Figma screen, copy to app/public/uat/live-<n>.png')
