import { useEffect, useMemo, useState } from 'react'
import { loadVeggie, loadItems, loadTreasures } from '../data/loaders'
import type { VeggieItem, Item, Treasure } from '../types'
import { BASE } from '../utils/assets'
import SearchBox from '../components/SearchBox'

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Resolve an item name to its icon URL (items ∪ treasures; exact, then normalised). "" → no icon.
function makeIconResolver(items: Item[], treasures: Treasure[]) {
  const exact = new Map<string, string>()
  const norm = new Map<string, string>()
  for (const { name, icon } of [...items, ...treasures] as { name: string; icon: string }[]) {
    if (!icon) continue
    if (!exact.has(name)) exact.set(name, icon)
    const nk = normName(name); if (!norm.has(nk)) norm.set(nk, icon)
  }
  return (name: string) => {
    if (!name) return ''
    const b = exact.get(name) ?? norm.get(normName(name)) ?? ''
    return b ? `${BASE}/assets/Items/${b}.png` : ''
  }
}

function Cell({ name, icon }: { name: string; icon: string }) {
  if (!name) return <span />
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {icon && <img src={icon} alt="" width={24} height={24} style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
      <span style={{ color: 'var(--text)', fontSize: 13 }}>{name}</span>
    </span>
  )
}

export default function VeggiePage() {
  const [rows, setRows] = useState<VeggieItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [zoneSel, setZoneSel] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadVeggie().then(setRows)
    loadItems().then(setItems)
    loadTreasures().then(setTreasures)
  }, [])

  const resolveIcon = useMemo(() => makeIconResolver(items, treasures), [items, treasures])

  const zones = useMemo(() => [...new Set(rows.map(r => r.zone))], [rows])
  const zone = zoneSel && zones.includes(zoneSel) ? zoneSel : (zones[0] ?? '')
  const searching = search.trim().length > 0

  // Empty search → selected zone's trades. Active search → matches across every zone (zone-tagged).
  const trades = useMemo(() => {
    if (searching) {
      const q = search.trim().toLowerCase()
      return rows.filter(r =>
        r.item.toLowerCase().includes(q) || r.common_trade.toLowerCase().includes(q) || r.rare_trade.toLowerCase().includes(q))
    }
    return rows.filter(r => r.zone === zone)
  }, [rows, zone, search, searching])

  const title = searching ? `Search: “${search.trim()}”` : zone
  const GRID = '1fr 1fr 1fr'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Search + zones ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {zones.map(z => {
            const active = z === zone && !searching
            return (
              <button key={z} onClick={() => { setSearch(''); setZoneSel(z) }} style={{
                display: 'block', width: '100%', padding: '6px 12px',
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, lineHeight: 1.3,
              }}>{z}</button>
            )
          })}
        </div>
      </div>

      {/* ── Trades ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
        <div style={{ padding: '12px 16px 6px' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)', maxWidth: 760 }}>
            Hand the Veggie Elder an item and he returns another. He'll trade 1–6 times per visit (Felyne Charisma
            guarantees 6), and has a ~20% chance to give the Rare result instead of the Common one (Felyne Negotiation
            raises this).
          </p>
        </div>

        {/* Column header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '4px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          <span>Item</span><span>Common Trade</span><span>Rare Trade</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {trades.map((t, i) => (
            <div key={i} className="tbl-row" style={{ padding: '4px 0' }}>
              {searching && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{t.zone}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', gap: 8 }}>
                <Cell name={t.item} icon={resolveIcon(t.item)} />
                <Cell name={t.common_trade} icon={resolveIcon(t.common_trade)} />
                <Cell name={t.rare_trade} icon={resolveIcon(t.rare_trade)} />
              </div>
            </div>
          ))}
          {searching && trades.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No trades match your search.</p>
          )}
        </div>
      </div>
    </div>
  )
}
