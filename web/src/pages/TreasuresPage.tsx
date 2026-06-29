import { useEffect, useMemo, useState } from 'react'
import { loadTreasures } from '../data/loaders'
import type { Treasure } from '../types'
import SearchBox from '../components/SearchBox'

export default function TreasuresPage() {
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [area, setArea] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Treasure | null>(null)

  useEffect(() => { loadTreasures().then(setTreasures) }, [])

  const areas = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = ['All']
    for (const t of treasures) {
      if (!seen.has(t.area)) { seen.add(t.area); list.push(t.area) }
    }
    return list
  }, [treasures])

  const filtered = useMemo(() => {
    let q = treasures
    if (area !== 'All') q = q.filter(t => t.area === area)
    if (search) {
      const s = search.toLowerCase()
      q = q.filter(t =>
        t.name.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.where_to_find.toLowerCase().includes(s)
      )
    }
    return q
  }, [treasures, area, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={area}
            onChange={e => { setArea(e.target.value); setSelected(null) }}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '4px 6px', fontSize: 12,
            }}
          >
            {areas.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        <SearchBox value={search} onChange={setSearch} placeholder="Search treasures…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(t => {
            const active = t === selected
            return (
              <button key={t.id} onClick={() => setSelected(t)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '5px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name}
                </span>
                <span style={{ color: 'var(--positive)', fontSize: 11, flexShrink: 0 }}>
                  {t.points}pt
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No treasures found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a treasure from the list.</p>
          : <TreasureDetail treasure={selected} />
        }
      </div>
    </div>
  )
}

function TreasureDetail({ treasure: t }: { treasure: Treasure }) {
  return (
    <div style={{ maxWidth: 540 }}>
      <h2 style={{ margin: '0 0 4px', color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{t.name}</h2>
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 12 }}>
        {t.area} · Rarity {t.rarity}
      </p>

      {t.description && (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>
          {t.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 400 }}>
        <InfoCard label="Where to Find" value={t.where_to_find} />
        <InfoCard label="Points" value={`${t.points} pt`} accent />
      </div>
    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 4, padding: '8px 10px', border: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 2px', color: 'var(--muted)', fontSize: 10,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600,
                  color: accent ? 'var(--positive)' : 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}
