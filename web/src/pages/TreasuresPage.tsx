import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadTreasures } from '../data/loaders'
import type { Treasure } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import { BASE } from '../utils/assets'
import { useItemSources, normName, type MonsterSource } from '../hooks/useItemSources'

const AWARD_GOLD = '#E0B000'

export default function TreasuresPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [search, setSearch] = useState('')
  const { monsterSrc } = useItemSources()
  const selected = useMemo(() => treasures.find(t => String(t.id) === id) ?? null, [treasures, id])

  useEffect(() => { loadTreasures().then(setTreasures) }, [])

  // Filter by name/description/where-to-find, then group by area (source order).
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (t: Treasure) => !q
      || t.name.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q)
      || t.where_to_find.toLowerCase().includes(q)
    const order: string[] = []
    const byArea = new Map<string, Treasure[]>()
    for (const t of treasures) {
      if (!match(t)) continue
      if (!byArea.has(t.area)) { byArea.set(t.area, []); order.push(t.area) }
      byArea.get(t.area)!.push(t)
    }
    return order.map(a => ({ area: a, items: byArea.get(a)! }))
  }, [treasures, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 260, minWidth: 260,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search treasures…" />
        <p style={{ margin: 0, padding: '0 10px 6px', fontSize: 11, fontStyle: 'italic', color: 'var(--muted)' }}>
          <span style={{ color: AWARD_GOLD }}>★</span> = Guild Card award (collect for a card award).
        </p>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {groups.map(g => (
            <div key={g.area}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12, padding: '6px 10px 2px' }}>{g.area}</div>
              {g.items.map(t => {
                const active = selected?.id === t.id
                return (
                  <button key={t.id} onClick={() => navigate(`/treasures/${t.id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '3px 10px',
                    background: active ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  }}>
                    <img src={`${BASE}/assets/Items/${t.icon}.png`} alt="" width={24} height={24}
                         style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                         onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                    {t.is_award ? <span style={{ color: AWARD_GOLD, fontSize: 13, flexShrink: 0 }} title="Guild Card award">★</span> : null}
                    <span style={{ flex: 1 }}>{t.name}</span>
                  </button>
                )
              })}
            </div>
          ))}
          {groups.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No treasures found.</p>}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a treasure from the list.</p>
          : <TreasureDetail treasure={selected} monsters={monsterSrc.get(normName(selected.name)) ?? []} />
        }
      </div>
    </div>
  )
}

function TreasureDetail({ treasure: t, monsters }: { treasure: Treasure; monsters: MonsterSource[] }) {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img src={`${BASE}/assets/Items/${t.icon}.png`} alt={t.name} width={48} height={48}
             style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>{t.name}</h2>
            {t.is_award ? (
              <span style={{ background: AWARD_GOLD, color: '#1E1E1E', borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>★ AWARD</span>
            ) : null}
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{t.area}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'treasure', id: String(t.id), name: t.name, path: `/treasures/${t.id}`, icon: t.icon ? `${BASE}/assets/Items/${t.icon}.png` : undefined }} />
      </div>

      {t.description && (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text)' }}>{t.description}</p>
      )}

      <table style={{ borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          {[
            ['Where to Find', t.where_to_find || '—'],
            ['Points', t.points || '—'],
            ['Rarity', t.rarity || '—'],
          ].map(([label, value]) => (
            <tr key={label} className="tbl-row">
              <td className="tbl-cell" style={{ color: 'var(--muted)', width: 110, verticalAlign: 'top' }}>{label}</td>
              <td className="tbl-cell">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {monsters.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Obtained From Monsters</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 560 }}>
            <thead>
              <tr>{['Monster', 'Source', 'Rank', 'Rate'].map((h, i) => (
                <th key={h} className="tbl-header" style={{ textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {monsters.map((m, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">
                    {m.monster && (
                      <button onClick={() => navigate(`/monsters/${m.monsterId}`)} title="View this monster" style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 12, fontWeight: 600, textAlign: 'left',
                      }}>{m.monster}</button>
                    )}
                  </td>
                  <td className="tbl-cell">{m.source}</td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{m.rank}</td>
                  <td className="tbl-cell" style={{ textAlign: 'right' }}>{m.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
