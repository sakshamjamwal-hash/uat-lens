import Reveal from './Reveal.jsx'
import { EASE } from '../motion.js'

// Neutral fallback — shown only if meta is absent but tabs exist. Zeroed out.
const DEFAULT_STATS = [
  { label: 'TOTAL', pill: 'ALL', num: '0', cls: '', cap: 'gaps found · Figma vs build' },
  { label: 'CRITICAL', pill: null, num: '0', cls: 'c', cap: 'blocker · ship-stopping' },
  { label: 'MAJOR', pill: null, num: '0', cls: 'h', cap: 'user-facing regression' },
  { label: 'MINOR', pill: null, num: '0', cls: 'm', cap: 'polish / verify' },
]

// Imported mode — Total / Critical / Major / Minor.
// critical=danger ('c'), major=accent/high ('h'), minor=info ('m'), total neutral ('').
function statsFromMeta(meta) {
  const s = meta.stats || {}
  return [
    { label: 'TOTAL', pill: 'ALL', num: String(s.total ?? 0), cls: '', cap: 'gaps found · Figma vs build' },
    { label: 'CRITICAL', pill: null, num: String(s.critical ?? 0), cls: 'c', cap: 'blocker · ship-stopping' },
    { label: 'MAJOR', pill: null, num: String(s.major ?? 0), cls: 'h', cap: 'user-facing regression' },
    { label: 'MINOR', pill: null, num: String(s.minor ?? 0), cls: 'm', cap: 'polish / verify' },
  ]
}

export default function StatCards({ meta }) {
  const STATS = meta ? statsFromMeta(meta) : DEFAULT_STATS
  return (
    <section className="stats">
      {STATS.map((s, i) => (
        <Reveal
          key={s.label}
          className="stat"
          y={16}
          delay={0.15 + i * 0.07}
          whileHover={{ y: -3, borderColor: 'var(--border-strong)', transition: { duration: 0.2, ease: EASE } }}
        >
          <div className="stat-lbl">
            <span className="mono">{s.label}</span>
            {s.pill && <span className="pill">{s.pill}</span>}
          </div>
          <div className={`stat-num ${s.cls}`}>{s.num}</div>
          <div className="stat-cap">{s.cap}</div>
        </Reveal>
      ))}
    </section>
  )
}
