import Reveal from './Reveal.jsx'

export default function Hero({ meta, stats }) {
  if (meta) {
    const s = stats || meta.stats || {}
    const total = s.total != null ? s.total : ''
    const sections = meta.tabCount != null ? meta.tabCount : ''
    return (
      <section className="hero">
        <Reveal className="eyebrow" y={10} delay={0.05}>
          {meta.subtitle || 'Design QA · Figma ↔ Build'}
        </Reveal>
        <Reveal as="h1" className="hero-title" y={18} delay={0.13}>
          {meta.title}<br />
          <span className="acc">{meta.titleAccent || 'investigation'}</span>
        </Reveal>
        <Reveal className="badge" y={10} delay={0.22}>
          <span className="dot" />
          <span className="mono">
            {total} GAPS{sections !== '' ? ` · ${sections} PAIRS` : ''}{meta.figmaKey ? ` · FIGMA ${meta.figmaKey}` : ''}
          </span>
        </Reveal>
      </section>
    )
  }

  return (
    <section className="hero">
      <Reveal className="eyebrow" y={10} delay={0.05}>
        Design QA · Figma ↔ Build
      </Reveal>
      <Reveal as="h1" className="hero-title" y={18} delay={0.13}>
        Design UAT<br />
        <span className="acc">investigation</span>
      </Reveal>
      <Reveal className="badge" y={10} delay={0.22}>
        <span className="dot" />
        <span className="mono">FIGMA ↔ BUILD</span>
      </Reveal>
    </section>
  )
}
