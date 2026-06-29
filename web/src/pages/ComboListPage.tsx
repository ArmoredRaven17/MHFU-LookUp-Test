import { useEffect, useMemo, useState } from 'react'
import { loadCombos } from '../data/loaders'
import type { Combo } from '../types'
import SearchBox from '../components/SearchBox'

const SECTIONS = ['All', 'Combination List', 'Alchemy only', 'Treasure Hunts only']

export default function ComboListPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [section, setSection] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => { loadCombos().then(setCombos) }, [])

  const filtered = useMemo(() => {
    let q = combos
    if (section !== 'All') q = q.filter(c => c.section === section)
    if (search) {
      const s = search.toLowerCase()
      q = q.filter(c =>
        c.result.toLowerCase().includes(s) ||
        c.mat1.toLowerCase().includes(s) ||
        c.mat2.toLowerCase().includes(s)
      )
    }
    return q
  }, [combos, section, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Toolbar ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '3px 10px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 3, cursor: 'pointer',
              background: section === s ? 'var(--accent)' : 'var(--surface)',
              color: section === s ? '#111' : 'var(--muted)',
              fontWeight: section === s ? 600 : 400,
            }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: 260 }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search combos…" />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filtered.length} results</span>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Result</th>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Material 1</th>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Material 2</th>
              <th className="tbl-header" style={{ textAlign: 'right', width: 48 }}>%</th>
              <th className="tbl-header" style={{ textAlign: 'right', width: 40 }}>Qty</th>
              {section === 'All' && <th className="tbl-header" style={{ textAlign: 'left', width: 130 }}>Section</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell" style={{ fontWeight: 500 }}>{c.result}</td>
                <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{c.mat1}</td>
                <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{c.mat2}</td>
                <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--positive)' }}>{c.pct}</td>
                <td className="tbl-cell" style={{ textAlign: 'right' }}>{c.qty}</td>
                {section === 'All' && <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 11 }}>{c.section}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No combos found.</p>
        )}
      </div>
    </div>
  )
}
