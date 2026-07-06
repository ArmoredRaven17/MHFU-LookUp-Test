import { BASE } from './assets'

// Areas whose normalised name has no Locations asset → reuse a sibling's icon.
const ICON_OVERRIDE: Record<string, string> = {
  great_arena: 'battleground',
  moat_arena: 'battleground',
  snowy_mountains_peak: 'snowy_mountains',
  tower_2: 'tower',
  tower_3: 'tower',
}

function locKey(area: string) {
  return area.toLowerCase().replace(/\s*&\s*/g, '_and_').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export function locationIconUrl(area: string) {
  const key = locKey(area)
  return `${BASE}/assets/Locations/${ICON_OVERRIDE[key] ?? key}.png`
}

// Thematic colour per locale (icy blue, sandy desert, green jungle/forest, …).
export function locationColor(area: string) {
  const l = area.toLowerCase()
  if (l.includes('snow')) return '#7FD8F0'
  if (l.includes('desert')) return '#E0B060'
  if (l.includes('volcano')) return '#FF7A4D'
  if (l.includes('swamp')) return '#A8A24E'
  if (l.includes('jungle') || l.includes('forest') || l.includes('hills')) return '#6ABF6A'
  if (l.includes('tower')) return '#9FB0C0'
  return 'var(--text)'
}
