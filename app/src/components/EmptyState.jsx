import Reveal from './Reveal.jsx'

export default function EmptyState() {
  return (
    <section className="hero" style={{ paddingBottom: 96 }}>
      <Reveal className="eyebrow" y={10} delay={0.05}>
        Design QA · Figma ↔ Build
      </Reveal>
      <Reveal as="h1" className="hero-title" y={18} delay={0.13}>
        No report<br />
        <span className="acc">yet</span>
      </Reveal>
      <Reveal className="hero-tagline" y={10} delay={0.22}>
        There's no <code>public/uat-data.json</code> to render. Run the{' '}
        <code>/uat</code> command in Claude Code to generate one:
      </Reveal>
      <Reveal className="badge" y={10} delay={0.3}>
        <span className="dot" />
        <span className="mono">/uat &lt;figma_url&gt; &lt;build_url | recording&gt;</span>
      </Reveal>
    </section>
  )
}
