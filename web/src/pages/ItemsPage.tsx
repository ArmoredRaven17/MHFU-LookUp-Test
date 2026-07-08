import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadItems } from '../data/loaders'
import type { Item } from '../types'
import SearchBox from '../components/SearchBox'
import { BASE } from '../utils/assets'
import BookmarkButton from '../components/BookmarkButton'
import { useItemSources, normName, type GatherSource, type MonsterSource } from '../hooks/useItemSources'
import { useTextScale } from '../theme/textScale'

// Item-master rows that are actually Treasure-Hunt items (shown in the Treasures tab instead).
const TREASURE_ITEMS = new Set([
  'Eldr Drgn Fossil', 'Century Walnut', 'Congalala Stomch', 'Congalala Innrds',
  'GarugaClavclMeat', 'GldFlynJewelSwd', 'Holed Shaka Mask', 'Velociprey Lily',
  'Gravibiscus', 'Shining Jellyfsh', 'Cephalos Wtrmeln', 'Nobunaga Bonito',
  'Plump Goldenfish', 'Med Wyvernfish', 'Lateobrium', 'Marilyn Btterfly',
])

const GATHER_MARK = `${BASE}/assets/Misc/gather_icon_green.png`
const TREASURE_FILTER = 'hue-rotate(-48deg) saturate(1.7) brightness(1.15)'   // green marker → yellow (Treasure Hunt)

export default function ItemsPage() {
  const scale = useTextScale()
  const { name } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const { gathered, monsterSrc, gatherable, treasureHunt } = useItemSources()
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => { loadItems().then(setItems) }, [])

  // Grouped by category (source order), hiding Cut Content + treasure-hunt items.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (it: Item) => !q || it.name.toLowerCase().includes(q) || (it.description ?? '').toLowerCase().includes(q)
    const order: string[] = []
    const byCat = new Map<string, Item[]>()
    for (const it of items) {
      if (it.category.toLowerCase() === 'cut content' || TREASURE_ITEMS.has(it.name) || !match(it)) continue
      if (!byCat.has(it.category)) { byCat.set(it.category, []); order.push(it.category) }
      byCat.get(it.category)!.push(it)
    }
    return order.map(c => ({ category: c, items: byCat.get(c)! }))
  }, [items, search])

  const selected = useMemo(() => name ? items.find(it => it.name === decodeURIComponent(name)) ?? null : null, [items, name])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 260 * scale + (scale > 1 ? 12 : 0), minWidth: 260 * scale + (scale > 1 ? 12 : 0),
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        <div style={{ padding: '0 8px 6px' }}>
          <select value="" onChange={e => groupRefs.current.get(e.target.value)?.scrollIntoView({ block: 'start' })} style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--muted)', padding: '3px 6px', fontSize: 12 * scale,
          }}>
            <option value="" disabled>Jump to category…</option>
            {groups.map(g => <option key={g.category} value={g.category} style={{ color: 'var(--text)' }}>{g.category}</option>)}
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {groups.map(g => (
            <div key={g.category}>
              <div ref={el => { if (el) groupRefs.current.set(g.category, el) }}
                   style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 * scale, padding: '6px 10px 2px' }}>
                {g.category}
              </div>
              {g.items.map(it => {
                const active = selected?.id === it.id
                return (
                  <button key={it.id} onClick={() => navigate(`/items/${encodeURIComponent(it.name)}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '3px 10px',
                    background: active ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
                  }}>
                    <img src={`${BASE}/assets/Items/${it.icon}.png`} alt="" width={26} height={26}
                         style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                         onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                    <span style={{ flex: 1 }}>{it.name}</span>
                    {gatherable.has(normName(it.name)) && (
                      <img src={GATHER_MARK} alt="" title="Gatherable" width={13} height={13} style={{ flexShrink: 0 }} />
                    )}
                    {treasureHunt.has(normName(it.name)) && (
                      <img src={GATHER_MARK} alt="" title="Treasure Hunt" width={13} height={13} style={{ flexShrink: 0, filter: TREASURE_FILTER }} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {groups.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No items found.</p>}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select an item from the list.</p>
          : <ItemDetail item={selected}
              gather={gathered.get(normName(selected.name)) ?? []}
              monsters={monsterSrc.get(normName(selected.name)) ?? []}
              treasure={treasureHunt.has(normName(selected.name))} />
        }
      </div>
    </div>
  )
}

function ItemDetail({ item: it, gather, monsters, treasure }: { item: Item; gather: GatherSource[]; monsters: MonsterSource[]; treasure: boolean }) {
  const scale = useTextScale()
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img src={`${BASE}/assets/Items/${it.icon}.png`} alt={it.name} width={48} height={48}
             style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{it.name}</h2>
            {gather.length > 0 && <img src={GATHER_MARK} alt="" title="Gatherable" width={17} height={17} />}
            {treasure && <img src={GATHER_MARK} alt="" title="Treasure Hunt" width={17} height={17} style={{ filter: TREASURE_FILTER }} />}
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 * scale }}>{it.category}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'item', id: String(it.id), name: it.name, path: `/items/${encodeURIComponent(it.name)}`, icon: it.icon ? `${BASE}/assets/Items/${it.icon}.png` : undefined }} />
      </div>

      {/* Info grid */}
      <table style={{ borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          {[
            ['Rarity', it.rarity || '—'],
            ['Capacity', it.capacity || '—'],
            ['Value', it.value ? `${it.value}z` : '—'],
            ...(it.pokke_value ? [['Pokke Value', it.pokke_value]] : []),
            ...(it.description ? [['Description', it.description]] : []),
          ].map(([label, value]) => (
            <tr key={label} className="tbl-row">
              <td className="tbl-cell" style={{ color: 'var(--muted)', width: 100, verticalAlign: 'top' }}>{label}</td>
              <td className="tbl-cell">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {gather.length > 0 && (
        <Section title="Gathered From">
          <SourceTable
            headers={['Location', 'Area', 'Rank', 'Rate']}
            rows={gather.map(g => [g.location, g.area, g.rank, g.rate])}
          />
        </Section>
      )}

      {monsters.length > 0 && (
        <Section title="Obtained From Monsters">
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
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 12 * scale, fontWeight: 600, textAlign: 'left',
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
        </Section>
      )}
    </div>
  )
}

function SourceTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 500 }}>
      <thead>
        <tr>{headers.map((h, i) => <th key={h} className="tbl-header" style={{ textAlign: i === headers.length - 1 ? 'right' : 'left' }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="tbl-row">
            {cells.map((c, j) => (
              <td key={j} className="tbl-cell" style={{ textAlign: j === cells.length - 1 ? 'right' : 'left', fontWeight: j === 0 && c ? 600 : 400, color: j === 0 ? 'var(--text)' : 'var(--muted)' }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      {children}
    </div>
  )
}
