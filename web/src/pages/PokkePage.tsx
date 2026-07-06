import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadPokke, loadItems, loadTreasures, loadDecorations } from '../data/loaders'
import type { PokkeItem, Item, Treasure, Decoration } from '../types'
import { BASE } from '../utils/assets'

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// A representative item per area (drives the sidebar icon), + the area display order.
const AREA_REP: Record<string, string> = {
  'Field Rows': 'Giant Corn', 'Fishing Pier': 'Springnight Carp', 'Casting Machine': 'Net',
  'Mining Points': 'Mega Pickaxe', 'Bomb Mining': 'Bounce Bomb', 'Insect Thicket': 'Killer Beetle',
  'Bug Tree': 'Hornetaur Wing', 'Mushroom Tree': 'Nitroshroom', 'Bee Hive': 'Honey', 'Great Sword Cave': 'Dark Piece',
}
const AREA_ORDER = ['Field Rows', 'Fishing Pier', 'Casting Machine', 'Mining Points', 'Bomb Mining',
  'Insect Thicket', 'Bug Tree', 'Mushroom Tree', 'Bee Hive', 'Great Sword Cave']

// "Perfect swing" notes render on a second line, matching the desktop FormatNote.
const formatNote = (note: string) => note.replace('  —  perfect swing: ', '\nPerfect: ')

// Resolve an item to a full icon URL (items ∪ treasures, then "+ Jewel", then tinted decoration, then strip ×N).
function makeIconResolver(items: Item[], treasures: Treasure[], decos: Decoration[]) {
  const exact = new Map<string, string>()
  const norm = new Map<string, string>()
  const jewelColor = new Map<string, string>()
  for (const { name, icon } of [...items, ...treasures] as { name: string; icon: string }[]) {
    if (!icon) continue
    if (!exact.has(name)) exact.set(name, icon)
    const nk = normName(name); if (!norm.has(nk)) norm.set(nk, icon)
  }
  for (const d of decos) if (d.color && !jewelColor.has(normName(d.name))) jewelColor.set(normName(d.name), d.color)

  const resolveItem = (name: string) => exact.get(name) ?? norm.get(normName(name)) ?? ''
  const resolve = (name: string): string => {
    const b = resolveItem(name) || resolveItem(`${name} Jewel`)
    if (b) return `${BASE}/assets/Items/${b}.png`
    for (const c of [name, `${name} Jewel`]) { const col = jewelColor.get(normName(c)); if (col) return `${BASE}/assets/Decorations/${col}.png` }
    const bare = name.replace(/\s*×\d+$/, '')
    if (bare !== name) return resolve(bare)
    return ''
  }
  return resolve
}

export default function PokkePage() {
  const { area: areaParam } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState<PokkeItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [decos, setDecos] = useState<Decoration[]>([])
  const [tierSel, setTierSel] = useState<string | null>(null)

  useEffect(() => {
    loadPokke().then(setRows)
    loadItems().then(setItems)
    loadTreasures().then(setTreasures)
    loadDecorations().then(setDecos)
  }, [])

  const resolveIcon = useMemo(() => makeIconResolver(items, treasures, decos), [items, treasures, decos])

  const areas = useMemo(() => {
    const seen = new Set<string>()
    for (const r of rows) seen.add(r.area)
    return [...seen].sort((a, b) => (AREA_ORDER.indexOf(a) + 1 || 99) - (AREA_ORDER.indexOf(b) + 1 || 99))
  }, [rows])

  const area = areaParam ? decodeURIComponent(areaParam) : areas[0] ?? ''

  // Group the selected area's rows by group_label (source order).
  const groups = useMemo(() => {
    const order: string[] = []
    const byLabel = new Map<string, { note: string; items: PokkeItem[] }>()
    for (const r of rows) {
      if (r.area !== area) continue
      if (!byLabel.has(r.group_label)) { byLabel.set(r.group_label, { note: r.group_note, items: [] }); order.push(r.group_label) }
      byLabel.get(r.group_label)!.items.push(r)
    }
    return order.map(l => ({ label: l, ...byLabel.get(l)! }))
  }, [rows, area])

  // Areas with several tiers get a picker; show one tier at a time (fall back to the first).
  const effGroup = groups.find(g => g.label === tierSel) ?? groups[0] ?? null

  const GRID = '32px 210px 1fr'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Farm areas ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)', overflowY: 'auto',
      }}>
        {areas.map(a => {
          const active = a === area
          const icon = AREA_REP[a] ? resolveIcon(AREA_REP[a]) : ''
          return (
            <button key={a} onClick={() => { setTierSel(null); navigate(`/pokke/${encodeURIComponent(a)}`) }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
              background: active ? 'var(--header-bg)' : 'transparent',
              border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              color: active ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
            }}>
              {icon && <img src={icon} alt="" width={24} height={24}
                style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
              <span>{a}</span>
            </button>
          )
        })}
      </div>

      {/* ── Obtainable items (all tiers stacked) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', background: 'transparent' }}>
        {!area || !effGroup
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a farm area.</p>
          : (() => {
            const g = effGroup
            const hasNotes = g.items.some(it => it.item_note.length > 0)
            return (
              <div>
                {/* Multi-tier areas get a picker; single-tier areas just show the label. */}
                {groups.length > 1
                  ? <select value={g.label} onChange={e => setTierSel(e.target.value)} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
                      color: 'var(--text)', padding: '4px 8px', fontSize: 13, fontWeight: 600, marginBottom: 6, minWidth: 220,
                    }}>
                      {groups.map(x => <option key={x.label} value={x.label}>{x.label}</option>)}
                    </select>
                  : <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 2 }}>{g.label}</div>}

                {g.note && <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--muted)' }}>{g.note}</p>}

                {hasNotes && (
                  <div style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: '1px solid var(--border)', padding: '0 0 2px', fontSize: 11, color: 'var(--text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span /><span>Item</span><span>Rate</span>
                  </div>
                )}

                {g.items.map((it, i) => (
                  <div key={i} className="tbl-row" style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '3px 0' }}>
                    {(() => { const ic = resolveIcon(it.item); return ic
                      ? <img src={ic} alt="" width={24} height={24} style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
                          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                      : <span /> })()}
                    <span style={{ color: 'var(--text)', fontSize: 13 }}>{it.item}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'pre-line' }}>{formatNote(it.item_note)}</span>
                  </div>
                ))}
              </div>
            )
          })()
        }
      </div>
    </div>
  )
}
