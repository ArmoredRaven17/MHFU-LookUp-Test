import { useEffect, useMemo, useState } from 'react'
import { loadGranny } from '../data/loaders'
import type { GrannyItem } from '../types'
import SearchBox from '../components/SearchBox'

const SECTIONS = [
  'Regular Inventory 1', 'Regular Inventory 2',
  'Discount Inventory 1', 'Discount Inventory 2',
  'DLC Inventory',
]

export default function GrannyPage() {
  const [items, setItems] = useState<GrannyItem[]>([])
  const [section, setSection] = useState(SECTIONS[0])
  const [search, setSearch] = useState('')

  useEffect(() => { loadGranny().then(setItems) }, [])

  const filtered = useMemo(() => {
    let q = items.filter(i => i.section === section)
    if (search) q = q.filter(i => i.item.toLowerCase().includes(search.toLowerCase()))
    return q
  }, [items, section, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Toolbar ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '6px 12px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => { setSection(s); setSearch('') }} style={{
            padding: '3px 10px', fontSize: 11, border: '1px solid var(--border)',
            borderRadius: 3, cursor: 'pointer',
            background: section === s ? 'var(--accent)' : 'var(--surface)',
            color: section === s ? '#111' : 'var(--muted)',
            fontWeight: section === s ? 600 : 400,
            whiteSpace: 'nowrap',
          }}>
            {s}
          </button>
        ))}
        <div style={{ flex: 1, maxWidth: 240 }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filtered.length} items</span>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 500, marginTop: 8 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Item</th>
              <th className="tbl-header" style={{ textAlign: 'right', width: 80 }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell">{it.item}</td>
                <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--positive)', fontWeight: 500 }}>
                  {it.price}
                </td>
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
