// Font-only text-size scaling (deliberately not a page zoom — see SettingsPage.tsx). Mirrors
// appearance.ts's localStorage pattern, but needs a reactive hook: colours scale for free via CSS
// custom properties, while a raw `fontSize: 12` inline style has to be re-multiplied on render.
import { useSyncExternalStore } from 'react'

export interface ScalePreset { value: number; label: string }

export const SCALE_PRESETS: ScalePreset[] = [
  { value: 0.75, label: '75%' },
  { value: 1,    label: '100% (default)' },
  { value: 1.25, label: '125%' },
  { value: 1.5,  label: '150%' },
  { value: 1.75, label: '175%' },
  { value: 2,    label: '200%' },
]

export const DEFAULT_SCALE = 1
const LS_SCALE = 'mhfu-text-scale'
const SCALE_EVENT = 'mhfu-text-scale-changed'

export const getTextScale = (): number => Number(localStorage.getItem(LS_SCALE)) || DEFAULT_SCALE

/** Set the `--text-scale` CSS var (used by the two CSS-class font-sizes in index.css). */
export function applyTextScale(value: number) {
  document.documentElement.style.setProperty('--text-scale', String(value))
}

export function setTextScale(value: number) {
  localStorage.setItem(LS_SCALE, String(value))
  applyTextScale(value)
  window.dispatchEvent(new Event(SCALE_EVENT))
}

export function resetTextScale() { setTextScale(DEFAULT_SCALE) }

/** Live text-scale multiplier — re-renders every `fontSize: N * scale` consumer on change. */
export function useTextScale(): number {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(SCALE_EVENT, cb)
      window.addEventListener('storage', cb)
      return () => { window.removeEventListener(SCALE_EVENT, cb); window.removeEventListener('storage', cb) }
    },
    getTextScale,
    () => DEFAULT_SCALE,
  )
}

/** Apply the saved scale on app start (sets --text-scale; React consumers read it via useTextScale()). */
export function initTextScale() { applyTextScale(getTextScale()) }
