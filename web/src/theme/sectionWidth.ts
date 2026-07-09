// User-dragged list-panel widths — keyed by each page's base (unscaled) width, so pages sharing a
// base width (e.g. the many 240px panels) share a remembered size, mirroring how the collapse
// toggle in theme/sectionCollapse.ts is a single global setting rather than per-page. Mirrors that
// file's localStorage + custom-event + useSyncExternalStore shape.
import { useSyncExternalStore } from 'react'

const LS_KEY = 'mhfu-section-widths'
const EVENT = 'mhfu-section-widths-changed'

type WidthMap = Record<string, number>

function readMap(): WidthMap {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}

export function getSectionWidth(baseWidth: number): number | null {
  return readMap()[String(baseWidth)] ?? null
}

export function setSectionWidth(baseWidth: number, px: number) {
  const map = readMap()
  map[String(baseWidth)] = Math.round(px)
  localStorage.setItem(LS_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event(EVENT))
}

export function useSectionWidth(baseWidth: number): number | null {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('storage', cb)
      return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
    },
    () => getSectionWidth(baseWidth),
    () => null,
  )
}
