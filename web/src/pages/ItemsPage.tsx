import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadItems } from '../data/loaders'
import type { Item } from '../types'
import SearchBox from '../components/SearchBox'
import { BASE } from '../utils/assets'

const ICON_SIZE = 28

export default function ItemsPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => { loadItems().then(setItems) }, [])

  const categories = useMemo(() => {
    const s = new Set(items.map(i => i.category))
    return ['All', ...Array.from(s).sort()]
  }, [items])

  const filtered = useMemo(() => items.filter(it => {
    if (categoryFilter !== 'All' && it.category !== categoryFilter) return false
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, search, categoryFilter])

  const selected = useMemo(() => {
    if (!name) return null
    return items.find(it => it.name === decodeURIComponent(name)) ?? null
  }, [items, name])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '3px 6px', fontSize: 12,
            }}
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(it => {
            const active = selected?.id === it.id
            return (
              <button
                key={it.id}
                onClick={() => navigate(`/items/${encodeURIComponent(it.name)}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '3px 10px',
                  background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                  border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  color: active ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                }}
              >
                <img
                  src={`${BASE}/assets/Items/${it.icon}.png`}
                  alt=""
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {it.name}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No items found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected ? (
          <p className="text-muted" style={{ marginTop: 16 }}>Select an item from the list.</p>
        ) : (
          <ItemDetail item={selected} />
        )}
      </div>
    </div>
  )
}

function ItemDetail({ item: it }: { item: Item }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img
          src={`${BASE}/assets/Items/${it.icon}.png`}
          alt={it.name}
          width={48}
          height={48}
          style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
        />
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{it.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{it.category}</p>
        </div>
      </div>

      {it.description && (
        <p style={{ color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16, fontSize: 13 }}>
          {it.description}
        </p>
      )}

      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {[
            ['Rarity',   it.rarity    || '—'],
            ['Capacity', it.capacity  || '—'],
            ['Value',    it.value     ? `${it.value}z` : '—'],
            ...(it.pokke_value ? [['Pokke Points', it.pokke_value]] : []),
          ].map(([label, value]) => (
            <tr key={label} className="tbl-row">
              <td className="tbl-cell" style={{ color: 'var(--muted)', width: 120 }}>{label}</td>
              <td className="tbl-cell">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
