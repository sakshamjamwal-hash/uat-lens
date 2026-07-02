export default function SectionHeader({ idx, title }) {
  return (
    <div className="sh">
      <span className="idx">{idx}</span>
      <h2>{title}</h2>
    </div>
  )
}
