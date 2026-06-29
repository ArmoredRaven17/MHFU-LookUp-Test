import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadWeapons } from '../data/loaders'
import type { Weapon } from '../types'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_ORDER = [
  'Great Sword','Long Sword','Sword & Shield','Dual Blades',
  'Hammer','Hunting Horn','Lance','Gunlance',
  'Bow','Light Bowgun','Heavy Bowgun',
]

// DB type → asset filename stem
function typeKey(t: string) {
  return t.replace(/ /g, '_').replace(/&/g, 'and')
}

function rarityTier(r?: number) {
  if (!r || r <= 0) return 1
  if (r >= 4) return Math.min(r, 10)
  return 1
}

function typeIcon(type: string, rarity?: number) {
  const k = typeKey(type)
  const t = rarityTier(rarity)
  return `/assets/WeaponTypes/${k}_R${t}.png`
}

// Sharpness: Red, Orange, Yellow, Green, Blue, White, Purple
const SHARP_COLORS = ['#d44','#d84','#cc0','#4a4','#48f','#ddd','#c5f']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeaponsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [weapons, setWeapons] = useState<Weapon[]>([])
  const [type, setType] = useState('Great Sword')

  useEffect(() => { loadWeapons().then(setWeapons) }, [])

  // When a weapon is selected that's a different type, sync the type panel
  const selected = useMemo(() => weapons.find(w => w.id === id) ?? null, [weapons, id])
  useEffect(() => { if (selected) setType(selected.type) }, [selected])

  // Weapons of current type, id→weapon map and tree structure
  const typeWeapons = useMemo(() =>
    weapons.filter(w => w.type === type).sort((a, b) => a.sort_order - b.sort_order),
    [weapons, type]
  )

  const { roots, childrenOf } = useMemo(() => {
    const ids = new Set(typeWeapons.map(w => w.id))
    const childrenOf = new Map<string | null, Weapon[]>()
    for (const w of typeWeapons) {
      const parentId = (w.doc.upgrades_from && ids.has(w.doc.upgrades_from))
        ? w.doc.upgrades_from : null
      const list = childrenOf.get(parentId) ?? []
      list.push(w)
      childrenOf.set(parentId, list)
    }
    return { roots: childrenOf.get(null) ?? [], childrenOf }
  }, [typeWeapons])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 260, minWidth: 260,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Type selector */}
        <div style={{
          padding: '6px 6px 4px',
          borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
        }}>
          {TYPE_ORDER.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 6px', borderRadius: 3, cursor: 'pointer',
              background: type === t ? 'rgba(200,168,75,0.2)' : 'transparent',
              border: type === t ? '1px solid var(--accent)' : '1px solid transparent',
              color: type === t ? 'var(--accent)' : 'var(--muted)',
              fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              <img src={typeIcon(t)} alt="" width={16} height={16}
                   style={{ objectFit: 'contain', flexShrink: 0 }} />
              {t}
            </button>
          ))}
        </div>

        {/* Weapon tree */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {roots.map(w => (
            <TreeNode key={w.id} weapon={w} childrenOf={childrenOf}
                      selectedId={id} onSelect={id => navigate(`/weapons/${id}`)} depth={0} />
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select a weapon from the tree.</p>
          : <WeaponDetail weapon={selected} allWeapons={weapons} onNavigate={id => navigate(`/weapons/${id}`)} />
        }
      </div>
    </div>
  )
}

// ── Weapon tree node ──────────────────────────────────────────────────────────

function TreeNode({ weapon: w, childrenOf, selectedId, onSelect, depth }: {
  weapon: Weapon
  childrenOf: Map<string | null, Weapon[]>
  selectedId?: string
  onSelect: (id: string) => void
  depth: number
}) {
  const children = childrenOf.get(w.id) ?? []
  const active = w.id === selectedId
  return (
    <div>
      <button onClick={() => onSelect(w.id)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        width: '100%', padding: `3px 8px 3px ${8 + depth * 14}px`,
        background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
        border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--accent)' : 'var(--text)',
        cursor: 'pointer', textAlign: 'left', fontSize: 12,
      }}>
        {depth > 0 && <span style={{ color: 'var(--border)', flexShrink: 0 }}>└</span>}
        <img src={typeIcon(w.type, w.doc.rarity)} alt="" width={16} height={16}
             style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {w.name}
        </span>
      </button>
      {children.map(c => (
        <TreeNode key={c.id} weapon={c} childrenOf={childrenOf}
                  selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

// ── Weapon detail ─────────────────────────────────────────────────────────────

function WeaponDetail({ weapon: w, allWeapons, onNavigate }: {
  weapon: Weapon
  allWeapons: Weapon[]
  onNavigate: (id: string) => void
}) {
  const doc = w.doc
  const isBowgun = w.type === 'Light Bowgun' || w.type === 'Heavy Bowgun'
  const isBow = w.type === 'Bow'
  const isMelee = !isBowgun && !isBow

  const parent = doc.upgrades_from ? allWeapons.find(x => x.id === doc.upgrades_from) : null
  const children = allWeapons.filter(x => x.doc.upgrades_from === w.id && x.type === w.type)
  const extUpgrades = doc.external_upgrades ?? []

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src={typeIcon(w.type, doc.rarity)} alt="" width={44} height={44}
             style={{ objectFit: 'contain' }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{w.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{w.type}</p>
        </div>
      </div>

      {/* Core stats */}
      <Section title="Stats">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <StatRow label="Attack" value={doc.atk} />
            {doc.element && <StatRow label="Element" value={doc.element} />}
            {doc.shelling && <StatRow label="Shelling" value={doc.shelling} />}
            {doc.affinity !== 0 && (
              <StatRow label="Affinity"
                value={<span style={{ color: doc.affinity > 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {doc.affinity > 0 ? '+' : ''}{doc.affinity}%
                </span>} />
            )}
            <StatRow label="Slots" value={
              doc.slots > 0 ? '○'.repeat(doc.slots) : '—'
            } />
            {doc.rarity && <StatRow label="Rarity" value={`Rare ${doc.rarity}`} />}
            {doc.price > 0 && <StatRow label="Price" value={`${doc.price.toLocaleString()}z`} />}
            {isBowgun && (
              <>
                {doc.reload && <StatRow label="Reload" value={doc.reload} />}
                {doc.recoil && <StatRow label="Recoil" value={doc.recoil} />}
              </>
            )}
          </tbody>
        </table>

        {/* Hunting Horn notes */}
        {w.type === 'Hunting Horn' && doc.notes && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 4 }}>Notes:</span>
            {doc.notes.map((n, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
                background: noteColor(n), color: '#111', fontSize: 11, fontWeight: 700,
              }}>{n}</span>
            ))}
          </div>
        )}
      </Section>

      {/* Sharpness (melee only) */}
      {isMelee && doc.sharpness && (
        <Section title="Sharpness">
          <div style={{ marginBottom: 4 }}>
            <SharpBar values={doc.sharpness} capacity={doc.sharpness_capacity ?? 40} />
          </div>
          {doc.sharpness_plus1 && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, display: 'block' }}>+1 Handicraft</span>
              <SharpBar values={doc.sharpness_plus1} capacity={doc.sharpness_capacity ?? 40} />
            </div>
          )}
        </Section>
      )}

      {/* Bow charges & coatings */}
      {isBow && (
        <Section title="Bow Details">
          {doc.charges && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Charges</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {doc.charges.map((c, i) => (
                  <span key={i} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 3, padding: '2px 6px', fontSize: 12,
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {doc.coatings && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Coatings</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {doc.coatings.map((c, i) => (
                  <span key={i} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 3, padding: '2px 6px', fontSize: 12,
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Bowgun ammo */}
      {isBowgun && <BowgunAmmo doc={doc} />}

      {/* Materials */}
      {doc.materials && (
        <Section title="Materials">
          <p style={{ color: 'var(--text)', fontSize: 13, margin: 0 }}>{doc.materials}</p>
        </Section>
      )}

      {/* Upgrade path */}
      {(parent || children.length > 0 || extUpgrades.length > 0) && (
        <Section title="Upgrade Path">
          {parent && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Upgrades from: </span>
              <button onClick={() => onNavigate(parent.id)} style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontSize: 13, padding: 0,
              }}>{parent.name}</button>
            </div>
          )}
          {children.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Upgrades into:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8 }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => onNavigate(c.id)} style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    cursor: 'pointer', fontSize: 13, padding: 0, textAlign: 'left',
                  }}>└ {c.name}</button>
                ))}
              </div>
            </div>
          )}
          {extUpgrades.length > 0 && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Cross-type upgrades:</p>
              {extUpgrades.map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>
                  {e.name} <span style={{ color: 'var(--muted)' }}>({e.type})</span>
                </p>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--accent)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="tbl-row">
      <td className="tbl-cell" style={{ color: 'var(--muted)', width: 110 }}>{label}</td>
      <td className="tbl-cell">{value}</td>
    </tr>
  )
}

function SharpBar({ values, capacity }: { values: number[]; capacity: number }) {
  const total = capacity || values.reduce((a, b) => a + b, 0) || 40
  const BAR_W = 200
  return (
    <div style={{ display: 'flex', height: 12, width: BAR_W, borderRadius: 2, overflow: 'hidden',
                  border: '1px solid var(--border)' }}>
      {values.map((v, i) => v > 0 && (
        <div key={i} style={{
          width: `${(v / total) * 100}%`, background: SHARP_COLORS[i], flexShrink: 0,
        }} />
      ))}
    </div>
  )
}

function noteColor(n: string) {
  const map: Record<string, string> = {
    P: '#ffffff', W: '#ffffff', R: '#e55', G: '#5b5', B: '#55e',
    Y: '#dd0', C: '#5cc', O: '#e80', N: '#88f',
  }
  return map[n] ?? '#888'
}

function BowgunAmmo({ doc }: { doc: import('../types').WeaponDoc }) {
  const sections: { label: string; data: Record<string, number | number[]> }[] = []
  if (doc.ammo_raw) sections.push({ label: 'Raw Ammo', data: doc.ammo_raw })
  if (doc.ammo_support) sections.push({ label: 'Support Ammo', data: doc.ammo_support })
  if (doc.ammo_element) sections.push({ label: 'Element Ammo', data: doc.ammo_element })
  if (doc.ammo_other) sections.push({ label: 'Other Ammo', data: doc.ammo_other })

  if (doc.rapid) {
    return (
      <Section title="Rapid Fire">
        <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 12px' }}>{doc.rapid}</p>
        {sections.map(s => <AmmoSection key={s.label} label={s.label} data={s.data} />)}
      </Section>
    )
  }

  return <>{sections.map(s => <Section key={s.label} title={s.label}><AmmoSection label="" data={s.data} /></Section>)}</>
}

function AmmoSection({ label, data }: { label: string; data: Record<string, number | number[]> }) {
  return (
    <>
      {label && <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>{label}</p>}
      <table style={{ borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {Object.entries(data).map(([ammo, qty]) => {
            const vals = Array.isArray(qty) ? qty : [qty]
            return (
              <tr key={ammo} className="tbl-row">
                <td className="tbl-cell" style={{ color: 'var(--muted)', width: 80 }}>{ammo}</td>
                {vals.map((v, i) => (
                  <td key={i} className="tbl-cell" style={{
                    textAlign: 'center', width: 36,
                    color: v > 0 ? 'var(--text)' : 'var(--border)',
                  }}>{v}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
