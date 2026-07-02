import { motion } from 'framer-motion'
import { TABS } from '../data/gaps.js'

export default function TabNav({ activeTab, onTabChange, tabs = TABS }) {
  return (
    <nav className="tab-nav">
      {tabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            className={`tab-btn${active ? ' active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {active && (
              <motion.span
                className="tab-underline"
                layoutId="tab-underline"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
