import { useEffect, useRef, useState } from 'react'
import { TABS } from '../data/gaps.js'

export default function TabNav({ activeTab, onTabChange, tabs = TABS }) {
  // Sticky-state detection: a 1px sentinel sits just above the nav; once it
  // scrolls out under the 40px top strip, the nav is pinned → add a backdrop
  // so content doesn't show through. Transparent while in normal flow.
  const sentinelRef = useRef(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: '-41px 0px 0px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} className="tab-sentinel" aria-hidden="true" />
      <nav className={`tab-nav${stuck ? ' is-stuck' : ''}`}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`tab-btn${active ? ' active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
