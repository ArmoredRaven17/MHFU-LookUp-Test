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

// Thematic colour per locale, derived from each location icon's dominant colour
// (lightened where the raw icon colour was too dark to read as flat text).
export function locationColor(area: string) {
  const l = area.toLowerCase()
  if (l.includes('old volcano')) return '#FA8E8D'
  if (l.includes('old jungle')) return '#67D55D'
  if (l.includes('old swamp')) return '#D7AAE7'
  if (l.includes('old desert')) return '#D3BB98'
  if (l.includes('snow')) return '#B8BFC4'
  if (l.includes('great forest')) return '#78BAAB'
  if (l.includes('forest') || l.includes('hills')) return '#AE9B84'
  if (l.includes('jungle')) return '#8FA397'
  if (l.includes('tower')) return '#8F97A3'
  if (l.includes('swamp')) return '#A088AA'
  if (l.includes('volcano')) return '#8FA397'
  if (l.includes('desert')) return '#AE9B84'
  if (l.includes('arena') || l.includes('battleground')) return '#9E8EA4'
  return 'var(--text)'
}
