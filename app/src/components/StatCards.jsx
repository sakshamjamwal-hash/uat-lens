import Reveal from './Reveal.jsx'

// Rendered as a vertical list beside the hero: label + caption left, count
// right, hairline dividers. Tallied live in App so the numbers always add up:
// total = critical + major + minor + verify.
export default function StatCards({ stats }) {
  const s = stats || { total: 0, critical: 0, major: 0, minor: 0, verify: 0 }
  const STATS = [
    { label: 'TOTAL', pill: 'ALL', num: s.total, cls: '', cap: 'gaps found · Figma vs build' },
    { label: 'CRITICAL', pill: null, num: s.critical, cls: 'c', cap: 'blocker · ship-stopping' },
    { label: 'MAJOR', pill: null, num: s.major, cls: 'h', cap: 'user-facing regression' },
    { label: 'MINOR', pill: null, num: s.minor, cls: 'm', cap: 'polish' },
    { label: 'VERIFY', pill: null, num: s.verify, cls: 'l', cap: 'needs human / DOM check' },
  ]
  return (
    <section className="stats">
      {STATS.map((st, i) => (
        <Reveal key={st.label} className="stat" y={12} delay={0.15 + i * 0.06}>
          <div className="stat-info">
            <div className="stat-lbl">
              <span className="mono">{st.label}</span>
              {st.pill && <span className="pill">{st.pill}</span>}
            </div>
            <div className="stat-cap">{st.cap}</div>
          </div>
          <div className={`stat-num ${st.cls}`}>{String(st.num)}</div>
        </Reveal>
      ))}
    </section>
  )
}
