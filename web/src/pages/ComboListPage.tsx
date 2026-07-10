import { useEffect, useMemo, useState } from 'react'
import { loadCombos, loadItems, loadTreasures } from '../data/loaders'
import type { Combo, Item, Treasure } from '../types'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'
import { makeComboIconResolver, pctColor } from '../utils/comboIcons'

// Dropdown: [section value, friendly label]. 'All' shows every section.
const SECTION_OPTIONS: [string, string][] = [
  ['All', 'All'],
  ['Combination List', 'Combo List'],
  ['Alchemy only', 'Alchemy Book'],
  ['Treasure Hunts only', 'Treasures'],
]
const SECTION_ORDER = ['Combination List', 'Alchemy only', 'Treasure Hunts only']

export default function ComboListPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [section, setSection] = useState('All')
  const [search, setSearch] = useState('')
  const scale = useTextScale()

  useEffect(() => {
    loadCombos().then(setCombos)
    loadItems().then(setItems)
    loadTreasures().then(setTreasures)
  }, [])

  const resolve = useMemo(() => makeComboIconResolver(items, treasures), [items, treasures])
  const iconUrl = (name: string) => { const ic = resolve(name); return ic ? `${BASE}/assets/Items/${ic}.png` : null }

  // Filter by section + Result search, grouped by section in display order.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (c: Combo) => !q
      || c.result.toLowerCase().includes(q)
      || c.mat1.toLowerCase().includes(q)
      || c.mat2.toLowerCase().includes(q)
    const wantSections = section === 'All' ? SECTION_ORDER : [section]
    return wantSections
      .map(s => ({ section: s, rows: combos.filter(c => c.section === s && match(c)) }))
      .filter(g => g.rows.length > 0)
  }, [combos, section, search])

  const label = (s: string) => SECTION_OPTIONS.find(([v]) => v === s)?.[1] ?? s

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'transparent' }}>
      {/* ── Toolbar ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={section} onChange={e => setSection(e.target.value)} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
          color: 'var(--text)', padding: '4px 8px', fontSize: 12 * scale,
        }}>
          {SECTION_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Result…" style={{
          flex: 1, maxWidth: 300, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text)', padding: '4px 10px', fontSize: 12 * scale, outline: 'none',
        }} />
      </div>

      {/* ── Grouped table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {groups.map(g => (
          <div key={g.section} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: 14 * scale, fontWeight: 700 }}>{label(g.section)}</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
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
                {g.rows.map((c, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell"><ItemCell name={c.result} icon={iconUrl(c.result)} bold /></td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>=</td>
                    <td className="tbl-cell"><ItemCell name={c.mat1} icon={iconUrl(c.mat1)} /></td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>{c.mat2 ? '+' : ''}</td>
                    <td className="tbl-cell">{c.mat2 && <ItemCell name={c.mat2} icon={iconUrl(c.mat2)} />}</td>
                    <td className="tbl-cell" style={{ textAlign: 'right', color: pctColor(c.pct), fontWeight: 600 }}>{c.pct}</td>
                    <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--muted)' }}>{c.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {groups.length === 0 && <p style={{ color: 'var(--muted)', padding: 16, fontSize: 13 * scale }}>No combinations found.</p>}
      </div>
    </div>
  )
}

function ItemCell({ name, icon, bold }: { name: string; icon: string | null; bold?: boolean }) {
  const scale = useTextScale()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {icon && <img src={icon} alt="" width={22 * scale} height={22 * scale}
        style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
      <span style={{ color: 'var(--text)', fontWeight: bold ? 600 : 400 }}>{name}</span>
    </span>
  )
}
