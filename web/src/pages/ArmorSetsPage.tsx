import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadArmorSets, loadSkills } from '../data/loaders'
import type { ArmorSet, ArmorVariant, ArmorPiece, Skill } from '../types'
import { BASE } from '../utils/assets'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import MaterialList from '../components/MaterialList'

// ── Helpers ─────────────────────────────────────────────────────────────────────

// Armor-icon rarity tier (1–3 share R1; 4+ use their own up to R10).
function rarityTier(r: number) {
  if (!r || r <= 0) return 1
  return r >= 4 ? Math.min(r, 10) : 1
}
const armorIcon = (slot: string, rarity: number) => `${BASE}/assets/Armor/${slot.toLowerCase()}_R${rarityTier(rarity)}.png`
const chestIcon = (rarity: number) => armorIcon('chest', rarity)

// Rarity-tier colour (matches the blacksmith icon palette). 1–3 share white.
function rarityColor(r: number) {
  if (r >= 10) return '#AC5CC0'
  if (r === 9) return '#FFD65A'
  if (r === 8) return '#FF5A5A'
  if (r === 7) return '#FF9C5A'
  if (r === 6) return '#94B5FF'
  if (r === 5) return '#EF94A5'
  if (r === 4) return '#73CE8C'
  return '#EFEFEF'
}

const SLOTS = ['head', 'chest', 'arms', 'waist', 'legs']
const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1))
const slotBar = (n: number) => {
  const k = Math.min(Math.max(n, 0), 3)
  return 'O'.repeat(k) + '-'.repeat(3 - k)   // 0=---, 1=O--, 2=OO-, 3=OOO
}
const defRange = (init: number, max: number) => (max > init ? `${init}~${max}` : `${init}`)
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const signColor = (n: number) => (n > 0 ? 'var(--positive)' : n < 0 ? 'var(--negative)' : 'var(--text)')
const normSkill = (s: string) => s.toLowerCase().replace(/[ ()[\]]+/g, '')

// Gendered piece name, falling back to the other gender when one is blank.
function pieceName(p: ArmorPiece, female: boolean) {
  const n = female ? p.name_female : p.name_male
  return n || (female ? p.name_male : p.name_female)
}

// Resolve a set's display name for the current gender/class toggles. Set names may encode gender
// as "<male> (Male) / <female> (Female)" and/or class as "<Blademaster> / <Gunner>".
function resolveSetName(name: string, female: boolean, gunner: boolean) {
  const hasMale = name.includes('(Male)')
  const hasFemale = name.includes('(Female)')
  let side = name
  if (hasMale && hasFemale) {
    const m = name.match(/^(.*?)\s*\(Male\)\s*\/\s*(.*?)\s*\(Female\)$/)
    if (m) {
      const male = m[1].trim(), fem = m[2].trim()
      side = female ? fem : male
      if (!side) side = female ? male : fem
    }
  } else if (hasFemale) side = stripFrom(name, '(Female)')
  else if (hasMale) side = stripFrom(name, '(Male)')
  return classHalf(side, gunner)
}
function stripFrom(s: string, marker: string) {
  const i = s.indexOf(marker)
  return i < 0 ? s : s.slice(0, i).trimEnd()
}
function classHalf(side: string, gunner: boolean) {
  const i = side.indexOf(' / ')
  if (i < 0) return side.trim()
  const bm = side.slice(0, i).trim()
  const gn = side.slice(i + 3).trim()
  if (gunner) return gn
  for (const suf of [' Armor Set', ' Armor', ' Suit']) if (gn.endsWith(suf)) return bm + suf
  return bm
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArmorSetsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sets, setSets] = useState<ArmorSet[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [gunner, setGunner] = useState(false)
  const [female, setFemale] = useState(false)
  const [rarityFilter, setRarityFilter] = useState('All')

  useEffect(() => {
    loadArmorSets().then(setSets)
    loadSkills().then(setSkills)
  }, [])

  const selectedClass = gunner ? 'Gunner' : 'Blademaster'

  // Skill tiers granted by negative points → detrimental activated skills.
  const negativeSet = useMemo(() => {
    const s = new Set<string>()
    for (const sk of skills) for (const lv of sk.levels) if (lv.points < 0) s.add(normSkill(lv.name))
    return s
  }, [skills])

  // Per-set searchable blob of skill + activated-skill names.
  const searchTerms = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sets) {
      const terms: string[] = []
      for (const v of s.variants) {
        terms.push(...v.activated_skills)
        for (const p of v.pieces) for (const sk of p.skills) terms.push(sk.skill_name)
      }
      m.set(s.id, terms.join(' ').toLowerCase())
    }
    return m
  }, [sets])

  // List: sets wearable by the selected class, matching the search, grouped by rarity.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const wearable = (s: ArmorSet) => s.variants.some(v => v.class_type === 'Both' || v.class_type === selectedClass)
    const match = (s: ArmorSet) => !q || s.name.toLowerCase().includes(q) || (searchTerms.get(s.id)?.includes(q) ?? false)
    const filtered = sets.filter(s => wearable(s) && match(s))
    const byR = new Map<number, ArmorSet[]>()
    for (const s of filtered) (byR.get(s.rarity) ?? byR.set(s.rarity, []).get(s.rarity)!).push(s)
    return [...byR.keys()].sort((a, b) => a - b).map(r => ({ rarity: r, sets: byR.get(r)! }))
  }, [sets, search, selectedClass, searchTerms])

  // All rarities present (unfiltered by the rarity dropdown itself, so its options stay stable).
  const rarityOptions = useMemo(() => [...new Set(groups.map(g => g.rarity))].sort((a, b) => a - b), [groups])
  const visibleGroups = rarityFilter === 'All' ? groups : groups.filter(g => String(g.rarity) === rarityFilter)

  const selected = useMemo(() => sets.find(s => s.id === id) ?? null, [sets, id])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search Armor Sets…" />
        <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>Searches set, skill &amp; activated skill</p>
          <Segmented options={['Blademaster', 'Gunner']} value={gunner ? 1 : 0} onChange={i => setGunner(i === 1)} />
          <Segmented options={['Male', 'Female']} value={female ? 1 : 0} onChange={i => setFemale(i === 1)} />
          <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '4px 8px', fontSize: 12,
          }}>
            <option value="All">All Rarities</option>
            {rarityOptions.map(r => <option key={r} value={String(r)}>Rarity {r}</option>)}
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {visibleGroups.map(g => (
            <div key={g.rarity}>
              <div style={{ fontWeight: 700, color: rarityColor(g.rarity), fontSize: 12, padding: '6px 10px 2px' }}>
                Rarity {g.rarity}
              </div>
              {g.sets.map(s => {
                const active = s.id === id
                return (
                  <button key={s.id} onClick={() => navigate(`/armorsets/${s.id}`)} style={{
                    display: 'block', width: '100%', padding: '4px 10px', textAlign: 'left',
                    background: active ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontSize: 13,
                  }}>
                    {resolveSetName(s.name, female, gunner)}
                  </button>
                )
              })}
            </div>
          ))}
          {visibleGroups.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No armor sets found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select an armor set.</p>
          : <ArmorSetDetail set={selected} selectedClass={selectedClass} female={female} gunner={gunner} negativeSet={negativeSet} />
        }
      </div>
    </div>
  )
}

function Segmented({ options, value, onChange }: { options: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(i)} style={{
          flex: 1, padding: '3px 0', fontSize: 11, cursor: 'pointer', border: 'none',
          background: value === i ? 'var(--accent)' : 'transparent',
          color: value === i ? '#111' : 'var(--muted)', fontWeight: value === i ? 600 : 400,
        }}>{o}</button>
      ))}
    </div>
  )
}

// ── Detail ──────────────────────────────────────────────────────────────────────

function ArmorSetDetail({ set, selectedClass, female, gunner, negativeSet }: {
  set: ArmorSet
  selectedClass: string
  female: boolean
  gunner: boolean
  negativeSet: Set<string>
}) {
  const name = resolveSetName(set.name, female, gunner)
  const variants = set.variants.filter(v => v.class_type === selectedClass || v.class_type === 'Both')

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>{name}</h2>
        <BookmarkButton bookmark={{ type: 'armorset', id: set.id, name, path: `/armorsets/${set.id}`, icon: chestIcon(set.rarity) }} />
      </div>
      <p style={{ margin: '0 0 8px', color: 'var(--muted)', fontSize: 12 }}>Rarity {set.rarity}</p>

      {variants.map((v, i) => (
        <VariantView key={i} variant={v} rarity={set.rarity} female={female}
                     showClassHeader={set.class_split === 1} negativeSet={negativeSet} />
      ))}

      <Section title="Notes">
        <NotesBox target={{ type: 'armorset', id: set.id, name, category: `${set.rank} Rank`, path: `/armorsets/${set.id}`, icon: chestIcon(set.rarity) }} />
      </Section>
    </div>
  )
}

function VariantView({ variant: v, rarity, female, showClassHeader, negativeSet }: {
  variant: ArmorVariant
  rarity: number
  female: boolean
  showClassHeader: boolean
  negativeSet: Set<string>
}) {
  const navigate = useNavigate()
  // Piece stat rows + a Total row.
  const totals = { def: 0, defMax: 0, fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 }
  for (const p of v.pieces) {
    totals.def += p.defense; totals.defMax += p.max_defense
    totals.fire += p.fire_res; totals.water += p.water_res; totals.thunder += p.thunder_res
    totals.ice += p.ice_res; totals.dragon += p.dragon_res
  }

  // Skill-points grid: one row per skill, per-slot columns + total, sorted by total desc.
  const bySlot = new Map<string, Map<string, number>>()
  const skillNames = new Map<string, string>()
  for (const p of v.pieces) {
    const m = new Map<string, number>()
    for (const sk of p.skills) { m.set(sk.skill_id, sk.points); skillNames.set(sk.skill_id, sk.skill_name) }
    bySlot.set(p.slot, m)
  }
  const skillRows = [...skillNames.keys()].map(sid => {
    const cell = (slot: string) => bySlot.get(slot)?.get(sid) ?? 0
    const total = SLOTS.reduce((a, s) => a + cell(s), 0)
    return { sid, name: skillNames.get(sid)!, cells: SLOTS.map(s => cell(s)), total }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  return (
    <div style={{ marginBottom: 18 }}>
      {showClassHeader && (
        <p style={{ margin: '4px 0 6px', color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>{v.class_type}</p>
      )}

      {/* Piece stats */}
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['', 'Slot', 'Name', 'Def', 'Slots', 'Fire', 'Water', 'Thunder', 'Ice', 'Dragon'].map((h, i) => (
                <th key={i} className="tbl-header" style={{ textAlign: i >= 3 && i !== 2 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.pieces.map(p => (
              <tr key={p.slot} className="tbl-row">
                <td className="tbl-cell"><img src={armorIcon(p.slot, rarity)} alt="" width={22} height={22} style={{ objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} /></td>
                <td className="tbl-cell">{cap(p.slot)}</td>
                <td className="tbl-cell">{pieceName(p, female)}</td>
                <td className="tbl-cell" style={{ textAlign: 'right' }}>{defRange(p.defense, p.max_defense)}</td>
                <td className="tbl-cell" style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>{slotBar(p.slots)}</td>
                {[p.fire_res, p.water_res, p.thunder_res, p.ice_res, p.dragon_res].map((r, i) => (
                  <td key={i} className="tbl-cell" style={{ textAlign: 'right', color: signColor(r) }}>{r}</td>
                ))}
              </tr>
            ))}
            <tr className="tbl-row" style={{ fontWeight: 600 }}>
              <td className="tbl-cell" />
              <td className="tbl-cell">Total</td>
              <td className="tbl-cell" />
              <td className="tbl-cell" style={{ textAlign: 'right' }}>{defRange(totals.def, totals.defMax)}</td>
              <td className="tbl-cell" />
              {[totals.fire, totals.water, totals.thunder, totals.ice, totals.dragon].map((r, i) => (
                <td key={i} className="tbl-cell" style={{ textAlign: 'right', color: signColor(r) }}>{r}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Skill points */}
      {skillRows.length > 0 && (
        <Section title="Skill Points">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Skill', 'Head', 'Chest', 'Arms', 'Waist', 'Legs', 'Total'].map((h, i) => (
                    <th key={h} className="tbl-header" style={{ textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skillRows.map(r => (
                  <tr key={r.sid} className="tbl-row">
                    <td className="tbl-cell">
                      <button onClick={() => navigate(`/armorskills/${r.sid}`)} title="Open in Armor Skills" style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600, fontSize: 13, textAlign: 'left',
                      }}>{r.name}</button>
                    </td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="tbl-cell" style={{ textAlign: 'right', color: c ? 'var(--text)' : 'var(--border)' }}>
                        {c ? signed(c) : '—'}
                      </td>
                    ))}
                    <td className="tbl-cell" style={{ textAlign: 'right', fontWeight: 600, color: signColor(r.total) }}>{signed(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Activated skills */}
      {v.activated_skills.length > 0 && (
        <Section title="Activated Skills">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {v.activated_skills.map((a, i) => (
              <span key={i} style={{ fontSize: 13, color: activatedColor(a, negativeSet) }}>{a}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Materials */}
      {v.pieces.some(p => p.materials.length > 0) && (
        <Section title="Materials">
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {v.pieces.filter(p => p.materials.length > 0).map(p => (
                <tr key={p.slot} className="tbl-row">
                  <td className="tbl-cell" style={{ verticalAlign: 'top', width: 150, color: 'var(--muted)' }}>{pieceName(p, female)}</td>
                  <td className="tbl-cell"><MaterialList csv={p.materials.map(m => `${m.qty} ${m.name}`).join(', ')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

// Green for beneficial activations, red for detrimental (negative-point tiers or clear cues).
function activatedColor(name: string, negativeSet: Set<string>) {
  const negative = negativeSet.has(normSkill(name))
    || /-\d/.test(name)
    || name.toLowerCase().includes('increase')
    || name.includes('(x2)') || name.includes('[x2]')
  return negative ? 'var(--negative)' : 'var(--positive)'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
