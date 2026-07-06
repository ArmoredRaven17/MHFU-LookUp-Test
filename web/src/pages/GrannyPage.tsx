import { useEffect, useMemo, useState } from 'react'
import { loadGranny, loadItems, loadTreasures } from '../data/loaders'
import type { GrannyItem, Item, Treasure } from '../types'
import { BASE } from '../utils/assets'

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Resolve a ware to its icon URL (items ∪ treasures; exact, then normalised).
function makeIconResolver(items: Item[], treasures: Treasure[]) {
  const exact = new Map<string, string>()
  const norm = new Map<string, string>()
  for (const { name, icon } of [...items, ...treasures] as { name: string; icon: string }[]) {
    if (!icon) continue
    if (!exact.has(name)) exact.set(name, icon)
    const nk = normName(name); if (!norm.has(nk)) norm.set(nk, icon)
  }
  return (name: string) => {
    const b = exact.get(name) ?? norm.get(normName(name)) ?? ''
    return b ? `${BASE}/assets/Items/${b}.png` : ''
  }
}

export default function GrannyPage() {
  const [rows, setRows] = useState<GrannyItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    loadGranny().then(setRows)
    loadItems().then(setItems)
    loadTreasures().then(setTreasures)
  }, [])

  const resolveIcon = useMemo(() => makeIconResolver(items, treasures), [items, treasures])

  const inventories = useMemo(() => [...new Set(rows.map(r => r.section))], [rows])
  const inventory = selected && inventories.includes(selected) ? selected : (inventories[0] ?? '')
  const isDiscount = inventory.toLowerCase().startsWith('discount')
  const wares = useMemo(() => rows.filter(r => r.section === inventory), [rows, inventory])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Rotating inventories ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)', overflowY: 'auto',
      }}>
        {inventories.map(inv => {
          const active = inv === inventory
          return (
            <button key={inv} onClick={() => setSelected(inv)} style={{
              display: 'block', width: '100%', padding: '7px 12px',
              background: active ? 'var(--header-bg)' : 'transparent',
              border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              color: active ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
            }}>{inv}</button>
          )
        })}
      </div>

      {/* ── Wares ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
        <div style={{ padding: '12px 16px 6px' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{inventory}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            The Peddling Granny sells from a rotating stock — her inventory changes over time.
          </p>
          {isDiscount && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--positive)' }}>Discount stock — these prices are reduced.</p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {wares.map((it, i) => {
            const icon = resolveIcon(it.item)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 180px 80px', alignItems: 'center', marginBottom: 3 }}>
                {icon
                  ? <img src={icon} alt="" width={24} height={24} style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  : <span />}
                <span style={{ color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{it.item}</span>
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{it.price}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
