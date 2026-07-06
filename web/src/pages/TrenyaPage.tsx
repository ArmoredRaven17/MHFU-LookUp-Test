import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadTrenya, loadItems, loadTreasures, loadDecorations } from '../data/loaders'
import type { TrenyaItem, Item, Treasure, Decoration } from '../types'
import { BASE } from '../utils/assets'
import { locationIconUrl, locationColor } from '../utils/location'
import BookmarkButton from '../components/BookmarkButton'

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Trenya jewel spellings whose in-app name differs by more than the "Jewel" suffix.
const JEWEL_ALIASES: Record<string, string> = {
  'Sharpshooter': 'SharpshootrJewel', 'Anti Venom': 'Antivenin Jewel',
  'Staying Power': 'StayingPwr Jewel', 'Heavenly Shield': 'HvnlyShieldJewel',
}

// Resolve a Trenya item to a full icon URL (items ∪ treasures; Jewels use the tinted decoration sprite).
function makeIconResolver(items: Item[], treasures: Treasure[], decos: Decoration[]) {
  const exact = new Map<string, string>()
  const norm = new Map<string, string>()
  const jewelColor = new Map<string, string>()
  for (const { name, icon } of [...items, ...treasures] as { name: string; icon: string }[]) {
    if (!icon) continue
    if (!exact.has(name)) exact.set(name, icon)
    const nk = normName(name); if (!norm.has(nk)) norm.set(nk, icon)
  }
  for (const d of decos) if (d.color && !jewelColor.has(normName(d.name))) jewelColor.set(normName(d.name), d.color)

  const resolveItem = (name: string): string => {
    if (exact.has(name)) return exact.get(name)!
    const nk = normName(name); if (norm.has(nk)) return norm.get(nk)!
    const bare = name.replace(/\s*\(.*?\)\s*$/, '').trim()   // drop trailing "(…)" note
    if (bare && bare !== name && norm.has(normName(bare))) return norm.get(normName(bare))!
    return ''
  }

  return (name: string, category: string): string => {
    if (category === 'Jewel') {
      const cands = [name, `${name} Jewel`]
      if (JEWEL_ALIASES[name]) cands.push(JEWEL_ALIASES[name])
      for (const c of cands) { const col = jewelColor.get(normName(c)); if (col) return `${BASE}/assets/Decorations/${col}.png` }
      for (const c of cands) { const b = resolveItem(c); if (b) return `${BASE}/assets/Items/${b}.png` }
      return ''
    }
    const b = resolveItem(name)
    return b ? `${BASE}/assets/Items/${b}.png` : ''
  }
}

export default function TrenyaPage() {
  const { loc } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState<TrenyaItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [decos, setDecos] = useState<Decoration[]>([])
  const [tier, setTier] = useState<number | null>(null)

  useEffect(() => {
    loadTrenya().then(setRows)
    loadItems().then(setItems)
    loadTreasures().then(setTreasures)
    loadDecorations().then(setDecos)
  }, [])

  const resolveIcon = useMemo(() => makeIconResolver(items, treasures, decos), [items, treasures, decos])

  const locations = useMemo(() => [...new Set(rows.map(r => r.location))], [rows])
  const location = loc ? decodeURIComponent(loc) : locations[0] ?? ''

  // Tiers (distinct Pokke Point amounts) for the selected destination.
  const tiers = useMemo(
    () => [...new Set(rows.filter(r => r.location === location).map(r => r.points))].sort((a, b) => a - b),
    [rows, location])
  const effTier = tier !== null && tiers.includes(tier) ? tier : (tiers[0] ?? null)

  // Category → items for the selected destination + tier (source order).
  const categories = useMemo(() => {
    if (effTier === null) return []
    const order: string[] = []
    const byCat = new Map<string, TrenyaItem[]>()
    for (const r of rows) {
      if (r.location !== location || r.points !== effTier) continue
      if (!byCat.has(r.category)) { byCat.set(r.category, []); order.push(r.category) }
      byCat.get(r.category)!.push(r)
    }
    return order.map(c => ({ category: c, items: byCat.get(c)! }))
  }, [rows, location, effTier])

  const selectLocation = (name: string) => { setTier(null); navigate(`/trenya/${encodeURIComponent(name)}`) }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Destinations ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)', overflowY: 'auto',
      }}>
        {locations.map(l => {
          const active = l === location
          return (
            <button key={l} onClick={() => selectLocation(l)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
              background: active ? 'var(--header-bg)' : 'transparent',
              border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
            }}>
              <img src={locationIconUrl(l)} alt="" width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }}
                   onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
              <span style={{ color: active ? 'var(--accent)' : locationColor(l) }}>{l}</span>
            </button>
          )
        })}
      </div>

      {/* ── Detail ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
        {/* Header: destination + bookmark + Pokke Points tier picker */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{location}</h2>
            <BookmarkButton bookmark={{ type: 'trenya', id: location, name: location, path: `/trenya/${encodeURIComponent(location)}`, icon: locationIconUrl(location) }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Pokke Points</span>
            {effTier !== null && (
              <select value={effTier} onChange={e => setTier(Number(e.target.value))} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
                color: 'var(--text)', padding: '3px 8px', fontSize: 12, minWidth: 160,
              }}>
                {tiers.map(t => <option key={t} value={t}>{t} Pokke Points</option>)}
              </select>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)', maxWidth: 720 }}>
            Each return brings several items (more at higher Pokke Points). Within a category, items are drawn uniformly at
            random — every item listed is equally likely, so Trenya has no per-item drop rates.
          </p>
        </div>

        {/* Category → items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {categories.map(g => (
            <div key={g.category} style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
              <div style={{ width: 140, minWidth: 140, color: 'var(--text)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.category}</div>
              <div style={{ flex: 1 }}>
                {g.items.map((it, i) => {
                  const icon = resolveIcon(it.item, it.category)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      {icon && <img src={icon} alt="" width={24} height={24}
                        style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
                      <span style={{ color: 'var(--text)', fontSize: 13 }}>{it.item}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {categories.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>Select a destination.</p>}
        </div>
      </div>
    </div>
  )
}
