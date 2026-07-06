import { useEffect, useState } from 'react'
import { loadItems, loadTreasures } from '../data/loaders'
import { BASE } from '../utils/assets'

/** One crafting-material entry resolved for display: its text, an item icon, and a route to open. */
export interface ResolvedMaterial {
  text: string           // full entry, e.g. "5 Iron Ore"
  icon?: string          // asset url, if the material is a known item/treasure
  path?: string          // route to the Items/Treasures entry, if resolvable
}

function normName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

interface Maps {
  icon: Map<string, string>; iconNorm: Map<string, string>
  path: Map<string, string>; pathNorm: Map<string, string>
}

/**
 * Resolves loosely-spaced material CSV ("5 Iron Ore, 3 Disk Stone") into entries with an icon
 * and a deep-link, matching the desktop weapon/armor material rows. Items win over treasures when
 * a name exists in both. Returns a parse function that yields plain text until the data loads.
 */
export function useMaterialResolver() {
  const [maps, setMaps] = useState<Maps | null>(null)

  useEffect(() => {
    Promise.all([loadItems(), loadTreasures()]).then(([items, treasures]) => {
      const m: Maps = { icon: new Map(), iconNorm: new Map(), path: new Map(), pathNorm: new Map() }
      const add = (name: string, ic: string, path: string) => {
        const nn = normName(name)
        if (ic) { if (!m.icon.has(name)) m.icon.set(name, ic); if (!m.iconNorm.has(nn)) m.iconNorm.set(nn, ic) }
        if (!m.path.has(name)) m.path.set(name, path)
        if (!m.pathNorm.has(nn)) m.pathNorm.set(nn, path)
      }
      // Items first (TryAdd-style keep-first), then treasures.
      for (const it of items) add(it.name, it.icon, `/items/${encodeURIComponent(it.name)}`)
      for (const t of treasures) add(t.name, t.icon, `/treasures/${t.id}`)
      setMaps(m)
    })
  }, [])

  return (csv: string): ResolvedMaterial[] =>
    csv.split(',').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean).map(entry => {
      const name = entry.replace(/^\d+\s+/, '')      // drop leading quantity
      if (!maps) return { text: entry }
      const nn = normName(name)
      let ic = maps.icon.get(name) ?? maps.iconNorm.get(nn)
      if (!ic) {
        // A missing ammo level (e.g. "Crag S Lv3") falls back to Lv1's icon.
        const lv = name.match(/^(.*) Lv\d+$/)
        if (lv) ic = maps.icon.get(`${lv[1]} Lv1`)
      }
      const path = maps.path.get(name) ?? maps.pathNorm.get(nn)
      return { text: entry, icon: ic ? `${BASE}/assets/Items/${ic}.png` : undefined, path }
    })
}
