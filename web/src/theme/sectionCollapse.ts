// Global, persisted "is the list panel collapsed" state — one shared toggle across every page,
// not per-page, so collapsing on one tab keeps it collapsed everywhere. Mirrors theme/textScale.ts's
// localStorage + custom-event + useSyncExternalStore shape exactly.
import { useSyncExternalStore } from 'react'

const LS_KEY = 'mhfu-section-collapsed'
const EVENT = 'mhfu-section-collapsed-changed'

export const getSectionCollapsed = (): boolean => localStorage.getItem(LS_KEY) === 'true'

export function setSectionCollapsed(value: boolean) {
  localStorage.setItem(LS_KEY, String(value))
  window.dispatchEvent(new Event(EVENT))
}

export function toggleSectionCollapsed() { setSectionCollapsed(!getSectionCollapsed()) }

export function useSectionCollapsed(): boolean {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('storage', cb)
      return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
    },
    getSectionCollapsed,
    () => false,
  )
}
