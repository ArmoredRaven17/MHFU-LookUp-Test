import { useEffect, useMemo, useState } from 'react'
import { loadTrenya } from '../data/loaders'
import type { TrenyaItem } from '../types'
import SearchBox from '../components/SearchBox'

const CATEGORIES = ['All', 'General', 'Mineral', 'Fish', 'Insect', 'Monster', 'Jewel', 'Unique']
const COSTS = [0, 200, 300, 500, 1000, 1500]

export default function TrenyaPage() {
  const [items, setItems] = useState<TrenyaItem[]>([])
  const [location, setLocation] = useState('All')
  const [category, setCategory] = useState('All')
  const [cost, setCost] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => { loadTrenya().then(setItems) }, [])

  const locations = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = ['All']
    for (const it of items) if (!seen.has(it.location)) { seen.add(it.location); list.push(it.location) }
    return list
  }, [items])

  const filtered = useMemo(() => {
    let q = items
    if (location !== 'All') q = q.filter(i => i.location === location)
    if (category !== 'All') q = q.filter(i => i.category === category)
    if (cost > 0) q = q.filter(i => i.points === cost)
    if (search) q = q.filter(i => i.item.toLowerCase().includes(search.toLowerCase()))
    return q
  }, [items, location, category, cost, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Toolbar ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Location */}
        <select value={location} onChange={e => setLocation(e.target.value)} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text)', padding: '3px 6px', fontSize: 12,
        }}>
          {locations.map(l => <option key={l}>{l}</option>)}
        </select>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '2px 8px', fontSize: 11, border: '1px solid var(--border)',
              borderRadius: 3, cursor: 'pointer',
              background: category === c ? 'var(--accent)' : 'var(--surface)',
              color: category === c ? '#111' : 'var(--muted)',
              fontWeight: category === c ? 600 : 400,
            }}>
              {c}
            </button>
          ))}
        </div>

        {/* Cost filter */}
        <select value={cost} onChange={e => setCost(Number(e.target.value))} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text)', padding: '3px 6px', fontSize: 12,
        }}>
          {COSTS.map(c => <option key={c} value={c}>{c === 0 ? 'Any cost' : `${c} pts`}</option>)}
        </select>

        <div style={{ flex: 1, maxWidth: 220 }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        </div>

        <span style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{filtered.length} items</span>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Item</th>
              {location === 'All' && <th className="tbl-header" style={{ textAlign: 'left', width: 160 }}>Location</th>}
              {category === 'All' && <th className="tbl-header" style={{ textAlign: 'left', width: 80 }}>Category</th>}
              <th className="tbl-header" style={{ textAlign: 'right', width: 70 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell">{it.item}</td>
                {location === 'All' && <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 12 }}>{it.location}</td>}
                {category === 'All' && <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 12 }}>{it.category}</td>}
                <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--positive)', fontWeight: 500 }}>{it.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No items found.</p>
        )}
      </div>
    </div>
  )
}
