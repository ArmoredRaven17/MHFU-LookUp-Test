import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadArmorSets } from '../data/loaders'
import type { ArmorSet, ArmorPiece } from '../types'
import SearchBox from '../components/SearchBox'

const SLOT_ORDER = ['head', 'chest', 'arms', 'waist', 'legs']
const SLOT_LABEL: Record<string, string> = {
  head: 'Head', chest: 'Chest', arms: 'Arms', waist: 'Waist', legs: 'Legs',
}
const RANKS = ['All', 'Low', 'High', 'G'] as const
type Rank = typeof RANKS[number]

function rarityTier(r: number) {
  if (r <= 0) return 1
  return r >= 4 ? Math.min(r, 10) : 1
}
function chestIcon(rarity: number) {
  return `/assets/Armor/chest_R${rarityTier(rarity)}.png`
}
function slotIcon(slot: string, rarity: number) {
  return `/assets/Armor/${slot}_R${rarityTier(rarity)}.png`
}

function signColor(n: number) {
  if (n > 0) return 'var(--positive)'
  if (n < 0) return 'var(--negative)'
  return 'var(--muted)'
}
function signStr(n: number) { return n > 0 ? `+${n}` : `${n}` }

export default function ArmorSetsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sets, setSets] = useState<ArmorSet[]>([])
  const [search, setSearch] = useState('')
  const [rank, setRank] = useState<Rank>('All')

  useEffect(() => { loadArmorSets().then(setSets) }, [])

  const filtered = useMemo(() => sets.filter(s => {
    if (rank !== 'All' && s.rank !== rank) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [sets, search, rank])

  const selected = useMemo(() => sets.find(s => s.id === id) ?? null, [sets, id])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search armor sets…" />

        {/* Rank tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
        }}>
          {RANKS.map(r => (
            <button key={r} onClick={() => setRank(r)} style={{
              flex: 1, padding: '4px 0', fontSize: 11, border: 'none', cursor: 'pointer',
              background: rank === r ? 'rgba(200,168,75,0.15)' : 'transparent',
              color: rank === r ? 'var(--accent)' : 'var(--muted)',
              borderBottom: rank === r ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: rank === r ? 600 : 400,
            }}>
              {r}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(s => {
            const active = s.id === id
            return (
              <button key={s.id} onClick={() => navigate(`/armorsets/${s.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '4px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <img src={chestIcon(s.rarity)} alt="" width={22} height={22}
                     style={{ objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{s.rank}</span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No sets found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select an armor set from the list.</p>
          : <ArmorSetDetail set={selected} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function ArmorSetDetail({ set: s }: { set: ArmorSet }) {
  const ordered = SLOT_ORDER.map(slot => s.pieces.find(p => p.slot === slot)).filter(Boolean) as ArmorPiece[]

  // Total defenses + resistances
  const totals = ordered.reduce(
    (acc, p) => ({
      defense:    acc.defense    + p.defense,
      fire_res:   acc.fire_res   + p.fire_res,
      water_res:  acc.water_res  + p.water_res,
      thunder_res:acc.thunder_res+ p.thunder_res,
      ice_res:    acc.ice_res    + p.ice_res,
      dragon_res: acc.dragon_res + p.dragon_res,
    }),
    { defense: 0, fire_res: 0, water_res: 0, thunder_res: 0, ice_res: 0, dragon_res: 0 }
  )

  // Aggregate skill points across all pieces
  const skillTotals = new Map<string, { name: string; pts: number }>()
  for (const p of ordered) {
    for (const sk of p.skills) {
      const cur = skillTotals.get(sk.skill_id) ?? { name: sk.skill_name, pts: 0 }
      cur.pts += sk.points
      skillTotals.set(sk.skill_id, cur)
    }
  }
  const totalSkills = [...skillTotals.values()].sort((a, b) => b.pts - a.pts)

  const totalSlots = ordered.reduce((acc, p) => acc + p.slots, 0)

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src={chestIcon(s.rarity)} alt="" width={44} height={44}
             style={{ objectFit: 'contain' }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{s.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
            {s.rank} Rank · Rare {s.rarity}
            {s.gender_exclusive && ` · ${s.gender_exclusive === 'male' ? 'Male only' : 'Female only'}`}
            {s.class_split === 1 && ' · BM / Gunner'}
          </p>
        </div>
      </div>

      {/* Pieces table */}
      <Section title="Armor Pieces">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ width: 24 }} />
                <th className="tbl-header" style={{ textAlign: 'left' }}>Piece</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 42 }}>Def</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 38, color: '#e66' }}>Fir</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 38, color: '#55f' }}>Wat</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 38, color: '#fb0' }}>Thn</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 38, color: '#8cf' }}>Ice</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 38, color: '#c5f' }}>Drg</th>
                <th className="tbl-header" style={{ textAlign: 'center', width: 38 }}>Slt</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Skills</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((p, i) => (
                <tr key={p.slot} className="tbl-row">
                  <td className="tbl-cell" style={{ padding: '3px 4px' }}>
                    <img src={slotIcon(p.slot, s.rarity)} alt={p.slot} width={20} height={20}
                         style={{ objectFit: 'contain', display: 'block' }} />
                  </td>
                  <td className="tbl-cell">{p.name}</td>
                  <td className="tbl-cell" style={{ textAlign: 'right' }}>{p.defense}</td>
                  <ResCell v={p.fire_res} />
                  <ResCell v={p.water_res} />
                  <ResCell v={p.thunder_res} />
                  <ResCell v={p.ice_res} />
                  <ResCell v={p.dragon_res} />
                  <td className="tbl-cell" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {'○'.repeat(p.slots) || '—'}
                  </td>
                  <td className="tbl-cell" style={{ fontSize: 12 }}>
                    {p.skills.map(sk => (
                      <span key={sk.skill_id} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
                        <span style={{ color: signColor(sk.points) }}>{signStr(sk.points)}</span>
                        {' '}{sk.skill_name}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="tbl-cell" />
                <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 11 }}>TOTAL</td>
                <td className="tbl-cell" style={{ textAlign: 'right', fontWeight: 600 }}>{totals.defense}</td>
                <ResCell v={totals.fire_res} bold />
                <ResCell v={totals.water_res} bold />
                <ResCell v={totals.thunder_res} bold />
                <ResCell v={totals.ice_res} bold />
                <ResCell v={totals.dragon_res} bold />
                <td className="tbl-cell" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  {totalSlots > 0 ? '○'.repeat(totalSlots) : '—'}
                </td>
                <td className="tbl-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Set skills summary */}
      {totalSkills.length > 0 && (
        <Section title="Set Skills">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {totalSkills.map(sk => (
              <span key={sk.name} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                <span style={{ color: signColor(sk.pts), fontWeight: 600 }}>
                  {signStr(sk.pts)}
                </span>
                {' '}{sk.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Materials per piece */}
      <Section title="Materials">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {ordered.map(p => p.materials.length > 0 && (
            <div key={p.slot}>
              <p style={{ margin: '0 0 4px', color: 'var(--accent)', fontSize: 11,
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {SLOT_LABEL[p.slot]}
              </p>
              {p.materials.map((m, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>
                  {m.qty}× {m.name}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function ResCell({ v, bold }: { v: number; bold?: boolean }) {
  return (
    <td className="tbl-cell" style={{
      textAlign: 'right', color: signColor(v), fontWeight: bold ? 600 : 400,
    }}>
      {v === 0 ? '—' : signStr(v)}
    </td>
  )
}
