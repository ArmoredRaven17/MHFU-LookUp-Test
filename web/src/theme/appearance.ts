// Auto-generated palette + appearance helpers. Presets ported from the desktop Appearance.cs.
import { useSyncExternalStore } from 'react'
import { BASE } from '../utils/assets'

export interface ColorPreset { key: string; name: string; window: string; base: string; panel: string; border: string; swatch: string }

export const COLOR_PRESETS: ColorPreset[] = [
  { key: 'silver',      name: 'Silver',      window: '#1E1E1F', base: '#272728', panel: '#232324', border: '#444546', swatch: '#BFC3C7' },
  { key: 'sand',        name: 'Sand',        window: '#1F1D19', base: '#282621', panel: '#24221E', border: '#464237', swatch: '#C2B48C' },
  { key: 'fog',         name: 'Fog',         window: '#1D1E1F', base: '#262728', panel: '#222324', border: '#434446', swatch: '#A8AEB4' },
  { key: 'taupe',       name: 'Taupe',       window: '#1F1D1B', base: '#282523', panel: '#242220', border: '#46413C', swatch: '#9A8C7C' },
  { key: 'steel',       name: 'Steel',       window: '#1A1E22', base: '#22272C', panel: '#20242A', border: '#3A434C', swatch: '#6E8090' },
  { key: 'mocha',       name: 'Mocha',       window: '#221C18', base: '#2D251F', panel: '#28211C', border: '#4B3F36', swatch: '#8C7361' },
  { key: 'slate',       name: 'Slate',       window: '#1B1E24', base: '#232830', panel: '#21262E', border: '#3A4250', swatch: '#5A6B80' },
  { key: 'charcoal',    name: 'Charcoal',    window: '#161616', base: '#1E1E1E', panel: '#1B1B1B', border: '#333333', swatch: '#5A5A5A' },
  { key: 'red',         name: 'Red',         window: '#241616', base: '#2C1C1C', panel: '#2A1919', border: '#4A3030', swatch: '#C04040' },
  { key: 'scarlet',     name: 'Scarlet',     window: '#221513', base: '#2D1B18', panel: '#281816', border: '#4B302C', swatch: '#E0402A' },
  { key: 'salmon',      name: 'Salmon',      window: '#221A18', base: '#2D221F', panel: '#281E1C', border: '#4B3B36', swatch: '#E8917A' },
  { key: 'coral',       name: 'Coral',       window: '#261812', base: '#2E1F18', panel: '#2B1C16', border: '#4C3A2E', swatch: '#E07050' },
  { key: 'rust',        name: 'Rust',        window: '#221814', base: '#2D201A', panel: '#281C17', border: '#4B372E', swatch: '#B0542C' },
  { key: 'brown',       name: 'Brown',       window: '#211913', base: '#292019', panel: '#261D16', border: '#463829', swatch: '#9C6B40' },
  { key: 'orange',      name: 'Orange',      window: '#241C12', base: '#2D2318', panel: '#2A2016', border: '#4A3A24', swatch: '#C0772E' },
  { key: 'amber',       name: 'Amber',       window: '#241E10', base: '#2D2616', panel: '#2A2414', border: '#4C4024', swatch: '#D8A028' },
  { key: 'gold',        name: 'Gold',        window: '#24200E', base: '#2E2913', panel: '#2A2512', border: '#4E4320', swatch: '#E6B41E' },
  { key: 'yellow',      name: 'Yellow',      window: '#23220E', base: '#2C2B14', panel: '#292813', border: '#4A4824', swatch: '#ECD92E' },
  { key: 'butter',      name: 'Butter',      window: '#211F14', base: '#2A2719', panel: '#262319', border: '#47432E', swatch: '#ECDD8E' },
  { key: 'chartreuse',  name: 'Chartreuse',  window: '#202214', base: '#2A2D1A', panel: '#252817', border: '#474B2F', swatch: '#C2D838' },
  { key: 'olive',       name: 'Olive',       window: '#1E2112', base: '#262A18', panel: '#232717', border: '#404826', swatch: '#8FA83C' },
  { key: 'lime',        name: 'Lime',        window: '#1C2210', base: '#232C16', panel: '#202915', border: '#3E4A24', swatch: '#9FCC30' },
  { key: 'sage',        name: 'Sage',        window: '#1C2218', base: '#242D1F', panel: '#20281C', border: '#3D4B36', swatch: '#88A878' },
  { key: 'green',       name: 'Green',       window: '#15211A', base: '#1C2A22', panel: '#1A271F', border: '#2E4438', swatch: '#3FA85A' },
  { key: 'mint',        name: 'Mint',        window: '#122520', base: '#182E28', panel: '#162A24', border: '#2C4A40', swatch: '#44C88A' },
  { key: 'teal',        name: 'Teal',        window: '#122321', base: '#192C2A', panel: '#172927', border: '#2C4744', swatch: '#2FBFB0' },
  { key: 'cyan',        name: 'Cyan',        window: '#10232A', base: '#172C34', panel: '#152930', border: '#2A4750', swatch: '#2EB8C8' },
  { key: 'sky',         name: 'Sky',         window: '#14202C', base: '#1B2935', panel: '#192530', border: '#2E4055', swatch: '#4AA8E0' },
  { key: 'blue',        name: 'Blue',        window: '#151B2A', base: '#1C2335', panel: '#1A2030', border: '#2E3A55', swatch: '#4A7FE0' },
  { key: 'navy',        name: 'Navy',        window: '#121726', base: '#182038', panel: '#161D32', border: '#28345A', swatch: '#3A5FC0' },
  { key: 'cobalt',      name: 'Cobalt',      window: '#141722', base: '#1A1E2D', panel: '#171B28', border: '#2F354B', swatch: '#3A5CDC' },
  { key: 'periwinkle',  name: 'Periwinkle',  window: '#181A22', base: '#1F212D', panel: '#1C1D28', border: '#363A4B', swatch: '#8494EC' },
  { key: 'indigo',      name: 'Indigo',      window: '#1A1630', base: '#221C3C', panel: '#1E1936', border: '#3A3160', swatch: '#6A5ACD' },
  { key: 'lavender',    name: 'Lavender',    window: '#201A30', base: '#28203C', panel: '#251D36', border: '#423A60', swatch: '#9A86E0' },
  { key: 'purple',      name: 'Purple',      window: '#221630', base: '#2A1C3C', panel: '#271936', border: '#443060', swatch: '#9050C0' },
  { key: 'magenta',     name: 'Magenta',     window: '#261430', base: '#2E1A3C', panel: '#2B1736', border: '#4A3060', swatch: '#B040C0' },
  { key: 'plum',        name: 'Plum',        window: '#24142A', base: '#2C1A34', panel: '#29172F', border: '#463058', swatch: '#A03C90' },
  { key: 'fuchsia',     name: 'Fuchsia',     window: '#22151F', base: '#2D1B28', panel: '#281823', border: '#4B3044', swatch: '#D040A8' },
  { key: 'raspberry',   name: 'Raspberry',   window: '#22131A', base: '#2D1922', panel: '#28161E', border: '#4B2D3B', swatch: '#C42C70' },
  { key: 'rose',        name: 'Rose',        window: '#261620', base: '#2E1C28', panel: '#2B1926', border: '#4E3045', swatch: '#E06A9A' },
  { key: 'ruby',        name: 'Ruby',        window: '#221117', base: '#2D171E', panel: '#28141A', border: '#4B2934', swatch: '#C81850' },
  { key: 'maroon',      name: 'Maroon',      window: '#28121A', base: '#301820', panel: '#2D151D', border: '#4E2C3A', swatch: '#9C2848' },
  { key: 'crimson',     name: 'Crimson',     window: '#260F15', base: '#2E151C', panel: '#2B1218', border: '#50303C', swatch: '#C03052' },
]

export const DEFAULT_SURFACE = 'charcoal'
export const DEFAULT_ACCENT = '#C04040'
export const DEFAULT_ICON = 'nargacuga'

const LS_SURFACE = 'mhfu-surface'
const LS_ACCENT = 'mhfu-accent'
const LS_ICON = 'mhfu-app-icon'

const root = () => document.documentElement.style

function clampHex(hex: string): string {
  const h = hex.trim()
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h : DEFAULT_ACCENT
}
function toRgb(hex: string): [number, number, number] {
  const h = clampHex(hex)
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function darken(hex: string, f: number): string {
  const [r, g, b] = toRgb(hex)
  const c = (n: number) => Math.round(n * f).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Surface theme (retints bg/surface/panel/border; accent is separate).
export function applySurface(key: string) {
  const p = COLOR_PRESETS.find(c => c.key === key) ?? COLOR_PRESETS.find(c => c.key === DEFAULT_SURFACE)!
  root().setProperty('--bg', p.window)
  root().setProperty('--bg-rgb', toRgb(p.window).join(', '))     // for translucent overlays
  root().setProperty('--surface', p.base)
  root().setProperty('--surface-rgb', toRgb(p.base).join(', '))  // for translucent overlays
  root().setProperty('--panel', p.panel)
  root().setProperty('--panel-rgb', toRgb(p.panel).join(', '))   // for translucent overlays
  root().setProperty('--border', p.border)
}

// Accent colour (drives --accent + derived vars).
export function applyAccent(hex: string) {
  const h = clampHex(hex)
  root().setProperty('--accent', h)
  root().setProperty('--accent-dim', darken(h, 0.75))
  root().setProperty('--header-bg', rgba(h, 0.12))
}

// App icon -> browser-tab favicon.
export function applyFavicon(iconId: string) {
  const id = iconId || DEFAULT_ICON
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
  link.type = 'image/png'
  link.href = `${BASE}/assets/Monsters/${id}.png`
}

export const getSurface = () => localStorage.getItem(LS_SURFACE) ?? DEFAULT_SURFACE
export const getAccent = () => localStorage.getItem(LS_ACCENT) ?? DEFAULT_ACCENT
export const getIcon = () => localStorage.getItem(LS_ICON) ?? DEFAULT_ICON

const ICON_EVENT = 'mhfu-app-icon-changed'

export function setSurface(key: string) { localStorage.setItem(LS_SURFACE, key); applySurface(key) }
export function setAccent(hex: string) { const h = clampHex(hex); localStorage.setItem(LS_ACCENT, h); applyAccent(h) }
export function setIcon(id: string) { localStorage.setItem(LS_ICON, id); applyFavicon(id); window.dispatchEvent(new Event(ICON_EVENT)) }

/** Live app-icon id (favicon + sidebar title icon), re-rendering on change. */
export function useAppIcon(): string {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(ICON_EVENT, cb)
      window.addEventListener('storage', cb)
      return () => { window.removeEventListener(ICON_EVENT, cb); window.removeEventListener('storage', cb) }
    },
    getIcon,
    () => DEFAULT_ICON,
  )
}

/** Apply saved appearance on app start. */
export function initAppearance() {
  applySurface(getSurface())
  applyAccent(getAccent())
  applyFavicon(getIcon())
}

/** Reset colour, accent, and favicon to defaults (tab icons reset separately). */
export function resetAppearance() {
  setSurface(DEFAULT_SURFACE)
  setAccent(DEFAULT_ACCENT)
  setIcon(DEFAULT_ICON)
}
