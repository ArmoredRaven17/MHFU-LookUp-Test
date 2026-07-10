import type { Item, Treasure } from '../types'
import { normName } from '../hooks/useItemSources'

const stripLv = (s: string) => s.replace(/\s*Lv\d+$/, '')

// Success-chance colour: high = green, mid = amber, low = red (clearer than a flat colour).
export function pctColor(pct: string) {
  const n = parseInt(pct, 10)
  if (isNaN(n)) return 'var(--muted)'
  if (n >= 90) return 'var(--positive)'
  if (n >= 70) return '#d9a441'
  return 'var(--negative)'
}

// Resolve a combo item name to its icon basename (items ∪ treasures; exact, then normalised,
// then ammo-Lv-stripped) — mirrors the desktop combo icon resolver.
export function makeComboIconResolver(items: Item[], treasures: Treasure[]) {
  const exact = new Map<string, string>([
    ['sm lao-shan claw', 'MH4G-Claw_Icon_Red'],
    ['goldfelynjewelsword', 'MH4G-Knife_Icon_Yellow'], // matches the Paralyze Thr Knf / GldFlynJewelSwd icon
  ])
  const norm = new Map<string, string>()
  const ammo = new Map<string, string>()
  for (const { name, icon } of [...items, ...treasures] as { name: string; icon: string }[]) {
    if (!icon) continue
    const lk = name.toLowerCase()
    if (!exact.has(lk)) exact.set(lk, icon)
    const nk = normName(name)
    if (!norm.has(nk)) norm.set(nk, icon)
    const sl = stripLv(name)
    if (sl !== name) { const ak = normName(sl); if (!ammo.has(ak)) ammo.set(ak, icon) }
  }
  return (name: string) => {
    if (!name) return ''
    return exact.get(name.toLowerCase()) ?? norm.get(normName(name)) ?? ammo.get(normName(stripLv(name))) ?? ''
  }
}
