import { FIX_MAP } from './fixes.js'

// Priority codes: 'C'=Critical, 'H'=High, 'M'=Medium, 'L'=Low
// The built-in dataset has been removed — UAT Lens renders the imported
// `public/uat-data.json` (see .claude/commands/uat.md for the schema).
// When that file is absent, the app shows an empty state.

// eslint-disable-next-line no-unused-vars
function fix(id, tabId) {
  return FIX_MAP[`${tabId}:${id}`] || FIX_MAP[id] || ''
}

export const TABS = []
