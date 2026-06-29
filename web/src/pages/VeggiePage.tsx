import { useEffect, useMemo, useState } from 'react'
import { loadVeggie } from '../data/loaders'
import type { VeggieItem } from '../types'
import SearchBox from '../components/SearchBox'

export default function VeggiePage() {
  const [items, setItems] = useState<VeggieItem[]>([])
  const [zone, setZone] = useState('All Zones')
  const [search, setSearch] = useState('')

  useEffect(() => { loadVeggie().then(setItems) }, [])

  const zones = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const it of items) if (!seen.has(it.zone)) { seen.add(it.zone); list.push(it.zone) }
    return list
  }, [items])

  const filtered = useMemo(() => {
    let q = zone === 'All Zones' ? items : items.filter(i => i.zone === zone)
    if (search) {
      const s = search.toLowerCase()
      q = q.filter(i =>
        i.item.toLowerCase().includes(s) ||
        i.common_trade.toLowerCase().includes(s) ||
        i.rare_trade.toLowerCase().includes(s)
      )
    }
    return q
  }, [items, zone, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 210, minWidth: 210,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {zones.map(z => {
            const active = z === zone
            return (
              <button key={z} onClick={() => { setZone(z); setSearch('') }} style={{
                display: 'block', width: '100%', padding: '5px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 12, lineHeight: 1.3,
              }}>
                {z}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 18, fontWeight: 600 }}>{zone}</h2>
            <div style={{ flex: 1, maxWidth: 260 }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filtered.length}</span>
          </div>

          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Trade In</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Common Receive</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Rare Receive</th>
                {zone === 'All Zones' && (
                  <th className="tbl-header" style={{ textAlign: 'left', width: 180 }}>Zone</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell" style={{ fontWeight: 500 }}>{it.item}</td>
                  <td className="tbl-cell">{it.common_trade || '—'}</td>
                  <td className="tbl-cell" style={{ color: it.rare_trade ? 'var(--positive)' : 'var(--muted)' }}>
                    {it.rare_trade || '—'}
                  </td>
                  {zone === 'All Zones' && (
                    <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 11 }}>{it.zone}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No items found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
