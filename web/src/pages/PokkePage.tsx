import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadPokke } from '../data/loaders'
import type { PokkeItem } from '../types'
import SearchBox from '../components/SearchBox'

export default function PokkePage() {
  const { area: areaParam } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<PokkeItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadPokke().then(setItems) }, [])

  const areas = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const it of items) if (!seen.has(it.area)) { seen.add(it.area); list.push(it.area) }
    return list
  }, [items])

  const selectedArea = areaParam
    ? decodeURIComponent(areaParam)
    : areas[0] ?? ''

  const areaItems = useMemo(
    () => items.filter(i => i.area === selectedArea),
    [items, selectedArea]
  )

  // Group by group_label within the selected area
  const groups = useMemo(() => {
    const map = new Map<string, { note: string; items: PokkeItem[] }>()
    for (const it of areaItems) {
      if (!map.has(it.group_label)) map.set(it.group_label, { note: it.group_note, items: [] })
      map.get(it.group_label)!.items.push(it)
    }
    return [...map.entries()].map(([label, g]) => ({ label, ...g }))
  }, [areaItems])

  const filtered = useMemo(() => {
    if (!search) return groups
    const s = search.toLowerCase()
    return groups.map(g => ({
      ...g,
      items: g.items.filter(i => i.item.toLowerCase().includes(s) || i.item_note.toLowerCase().includes(s)),
    })).filter(g => g.items.length > 0)
  }, [groups, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 180, minWidth: 180,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {areas.map(a => {
            const active = a === selectedArea
            return (
              <button key={a} onClick={() => { navigate(`/pokke/${encodeURIComponent(a)}`); setSearch('') }} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                {a}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selectedArea
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a farm area.</p>
          : (
            <div style={{ maxWidth: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{selectedArea}</h2>
                <div style={{ flex: 1, maxWidth: 240 }}>
                  <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
                </div>
              </div>

              {filtered.map(g => (
                <div key={g.label} style={{ marginBottom: 18 }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--accent)', fontSize: 13,
                               fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {g.label}
                  </h3>
                  {g.note && (
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {g.note}
                    </p>
                  )}
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>
                      {g.items.map((it, i) => (
                        <tr key={i} className="tbl-row">
                          <td className="tbl-cell">{it.item}</td>
                          {it.item_note && (
                            <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right' }}>
                              {it.item_note}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {filtered.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No items found.</p>
              )}
            </div>
          )
        }
      </div>
    </div>
  )
}
