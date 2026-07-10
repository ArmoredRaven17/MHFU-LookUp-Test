import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadItems, loadTreasures } from '../data/loaders'
import type { Item, Treasure, Combo } from '../types'
import SearchBox from '../components/SearchBox'
import { BASE } from '../utils/assets'
import BookmarkButton from '../components/BookmarkButton'
import { useItemSources, normName, type GatherSource, type MonsterSource } from '../hooks/useItemSources'
import { useTextScale } from '../theme/textScale'
import CollapsiblePanel from '../components/CollapsiblePanel'
import { makeComboIconResolver, pctColor } from '../utils/comboIcons'

// Item-master rows that are actually Treasure-Hunt items (shown in the Treasures tab instead).
const TREASURE_ITEMS = new Set([
  'Eldr Drgn Fossil', 'Century Walnut', 'Congalala Stomch', 'Congalala Innrds',
  'GarugaClavclMeat', 'GldFlynJewelSwd', 'Holed Shaka Mask', 'Velociprey Lily',
  'Gravibiscus', 'Shining Jellyfsh', 'Cephalos Wtrmeln', 'Nobunaga Bonito',
  'Plump Goldenfish', 'Med Wyvernfish', 'Lateobrium', 'Marilyn Btterfly',
])

const GATHER_MARK = `${BASE}/assets/Misc/gather_icon_green.png`
const TREASURE_FILTER = 'hue-rotate(-48deg) saturate(1.7) brightness(1.15)'   // green marker → yellow (Treasure Hunt)
// Web-only addition: no desktop equivalent flags an item as combinable — the desktop Items view has
// no combo cross-reference at all, so this badge + the "Combinations" detail section are web-only.
const COMBO_MARK = `${BASE}/assets/Items/MH4G-Book_Icon_Grey.png`

export default function ItemsPage() {
  const scale = useTextScale()
  const { name } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [search, setSearch] = useState('')
  const { gathered, monsterSrc, gatherable, treasureHunt, comboIndex } = useItemSources()
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const resolveComboIcon = useMemo(() => makeComboIconResolver(items, treasures), [items, treasures])

  useEffect(() => { loadItems().then(setItems); loadTreasures().then(setTreasures) }, [])

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
      <CollapsiblePanel width={260} style={{
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
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
                    <img src={`${BASE}/assets/Items/${it.icon}.png`} alt="" width={26 * scale} height={26 * scale}
                         style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                         onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                    <span style={{ flex: 1 }}>{it.name}</span>
                    {gatherable.has(normName(it.name)) && (
                      <img src={GATHER_MARK} alt="" title="Gatherable" width={13 * scale} height={13 * scale} style={{ flexShrink: 0 }} />
                    )}
                    {treasureHunt.has(normName(it.name)) && (
                      <img src={GATHER_MARK} alt="" title="Treasure Hunt" width={13 * scale} height={13 * scale} style={{ flexShrink: 0, filter: TREASURE_FILTER }} />
                    )}
                    {comboIndex.has(normName(it.name)) && (
                      <img src={COMBO_MARK} alt="" title="Combinable" width={13 * scale} height={13 * scale} style={{ flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {groups.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No items found.</p>}
        </div>
      </CollapsiblePanel>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select an item from the list.</p>
          : <ItemDetail item={selected}
              gather={gathered.get(normName(selected.name)) ?? []}
              monsters={monsterSrc.get(normName(selected.name)) ?? []}
              treasure={treasureHunt.has(normName(selected.name))}
              combos={comboIndex.get(normName(selected.name)) ?? []}
              resolveComboIcon={resolveComboIcon} />
        }
      </div>
    </div>
  )
}

function ItemDetail({ item: it, gather, monsters, treasure, combos, resolveComboIcon }: {
  item: Item; gather: GatherSource[]; monsters: MonsterSource[]; treasure: boolean
  combos: Combo[]; resolveComboIcon: (name: string) => string
}) {
  const scale = useTextScale()
  const navigate = useNavigate()
  const comboIconUrl = (name: string) => { const ic = resolveComboIcon(name); return ic ? `${BASE}/assets/Items/${ic}.png` : null }
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img src={`${BASE}/assets/Items/${it.icon}.png`} alt={it.name} width={48 * scale} height={48 * scale}
             style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{it.name}</h2>
            {gather.length > 0 && <img src={GATHER_MARK} alt="" title="Gatherable" width={17 * scale} height={17 * scale} />}
            {treasure && <img src={GATHER_MARK} alt="" title="Treasure Hunt" width={17 * scale} height={17 * scale} style={{ filter: TREASURE_FILTER }} />}
            {combos.length > 0 && <img src={COMBO_MARK} alt="" title="Combinable" width={17 * scale} height={17 * scale} />}
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
            ...(it.point_exchange ? [['Point Exchange', it.point_exchange]] : []),
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

      {combos.length > 0 && (
        <Section title="Combinations">
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 560 }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Product</th>
                <th className="tbl-header" />
                <th className="tbl-header" style={{ textAlign: 'left' }}>Item 1</th>
                <th className="tbl-header" />
                <th className="tbl-header" style={{ textAlign: 'left' }}>Item 2</th>
                <th className="tbl-header" style={{ textAlign: 'right' }}>Success Chance</th>
                <th className="tbl-header" style={{ textAlign: 'right' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((c, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell"><ComboItemCell name={c.result} icon={comboIconUrl(c.result)} bold badge={c.section === 'Alchemy only' ? <AlchemyBadge /> : undefined} /></td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>=</td>
                  <td className="tbl-cell"><ComboItemCell name={c.mat1} icon={comboIconUrl(c.mat1)} /></td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>{c.mat2 ? '+' : ''}</td>
                  <td className="tbl-cell">{c.mat2 && <ComboItemCell name={c.mat2} icon={comboIconUrl(c.mat2)} />}</td>
                  <td className="tbl-cell" style={{ textAlign: 'right', color: pctColor(c.pct), fontWeight: 600 }}>{c.pct}</td>
                  <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--muted)' }}>{c.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function ComboItemCell({ name, icon, bold, badge }: { name: string; icon: string | null; bold?: boolean; badge?: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {icon && <img src={icon} alt="" width={22 * scale} height={22 * scale}
        style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
      <span style={{ color: 'var(--text)', fontWeight: bold ? 600 : 400 }}>{name}</span>
      {badge}
    </span>
  )
}

function AlchemyBadge() {
  const scale = useTextScale()
  return (
    <span title="Made in the Alchemy Pot" style={{
      background: '#8a5fc7', color: '#fff', fontWeight: 700, borderRadius: 3, letterSpacing: '0.04em',
      fontSize: 9 * scale, padding: '1px 5px', flexShrink: 0,
    }}>ALCHEMY</span>
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
