import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadSkills, loadArmorSets } from '../data/loaders'
import type { Skill, ArmorSet } from '../types'
import SearchBox from '../components/SearchBox'
import { BASE } from '../utils/assets'
import BookmarkButton from '../components/BookmarkButton'
import { useTextScale } from '../theme/textScale'

const CATEGORY_ORDER = [
  'All Skills',
  'Offense', 'Defense', 'Resistance',
  'Blademaster', 'Bowgun', 'Bow',
  'Treasure Hunting', 'Farming', 'Misc. (Untagged)',
]

interface PieceEntry {
  setName: string
  pieceName: string
  slot: string
  points: number
  rarity: number
}

function rarityTier(r: number) {
  if (r <= 0) return 1
  return r >= 4 ? Math.min(r, 10) : 1
}
function slotIcon(slot: string, rarity: number) {
  return `${BASE}/assets/Armor/${slot}_R${rarityTier(rarity)}.png`
}
function signColor(n: number) {
  return n > 0 ? 'var(--positive)' : n < 0 ? 'var(--negative)' : 'var(--muted)'
}
function signStr(n: number) { return n > 0 ? `+${n}` : `${n}` }

export default function ArmorSkillsPage() {
  const scale = useTextScale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [skills, setSkills] = useState<Skill[]>([])
  const [armorSets, setArmorSets] = useState<ArmorSet[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Skills')

  useEffect(() => {
    loadSkills().then(setSkills)
    loadArmorSets().then(setArmorSets)
  }, [])

  // Build skill id → piece entries index
  const pieceIndex = useMemo(() => {
    const idx = new Map<string, PieceEntry[]>()
    for (const set of armorSets) {
      const seen = new Set<string>()   // dedupe identical pieces across BM/Gunner variants
      for (const variant of set.variants) {
        for (const piece of variant.pieces) {
          for (const sk of piece.skills) {
            const key = `${piece.slot}:${sk.skill_id}:${sk.points}`
            if (seen.has(key)) continue
            seen.add(key)
            const entries = idx.get(sk.skill_id) ?? []
            entries.push({
              setName: set.name,
              pieceName: piece.name_male || piece.name_female,
              slot: piece.slot,
              points: sk.points,
              rarity: set.rarity,
            })
            idx.set(sk.skill_id, entries)
          }
        }
      }
    }
    // Sort each list: rarity asc, points desc, set name asc
    for (const [, entries] of idx) {
      entries.sort((a, b) =>
        a.rarity !== b.rarity ? a.rarity - b.rarity :
        b.points !== a.points ? b.points - a.points :
        a.setName.localeCompare(b.setName)
      )
    }
    return idx
  }, [armorSets])

  // Available categories (ordered, only those with skills)
  const categories = useMemo(() => {
    const present = new Set(skills.flatMap(s => s.categories))
    const ordered = CATEGORY_ORDER.filter(c => c === 'All Skills' || present.has(c))
    // Append any not in the preferred order
    for (const c of present) {
      if (!ordered.includes(c)) ordered.push(c)
    }
    return ordered
  }, [skills])

  const filtered = useMemo(() => {
    let q = [...skills].sort((a, b) => a.name.localeCompare(b.name))
    if (category !== 'All Skills')
      q = q.filter(s => s.categories.includes(category))
    if (search)
      q = q.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    return q
  }, [skills, category, search])

  const selected = useMemo(() => skills.find(s => s.id === id) ?? null, [skills, id])
  const pieces = useMemo(
    () => selected ? (pieceIndex.get(selected.id) ?? []) : [],
    [selected, pieceIndex]
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240 * scale + (scale > 1 ? 12 : 0), minWidth: 240 * scale + (scale > 1 ? 12 : 0),
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Category dropdown */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '4px 6px', fontSize: 12 * scale,
            }}
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <SearchBox value={search} onChange={setSearch} placeholder="Search skills…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(s => {
            const active = s.id === id
            return (
              <button key={s.id} onClick={() => navigate(`/armorskills/${s.id}`)} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
              }}>
                {s.name}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No skills found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select a skill from the list.</p>
          : <SkillDetail skill={selected} pieces={pieces} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function SkillDetail({ skill: s, pieces }: { skill: Skill; pieces: PieceEntry[] }) {
  const scale = useTextScale()
  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <h2 style={{ margin: '0 0 2px', color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>
          {s.name}
        </h2>
        <BookmarkButton bookmark={{ type: 'armorskill', id: s.id, name: s.name, path: `/armorskills/${s.id}` }} />
      </div>
      {s.categories.length > 0 && (
        <p style={{ margin: '0 0 6px', color: 'var(--muted)', fontSize: 12 * scale }}>
          {s.categories.join(' · ')}
        </p>
      )}
      {s.description && (
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }}>
          {s.description}
        </p>
      )}

      {/* Skill levels table — single-tier skills skip the Effect column since it's just
          a repeat of the description already shown above. */}
      <Section title="Skill Levels">
        <table style={{ borderCollapse: 'collapse', width: s.levels.length > 1 ? '100%' : 'auto', maxWidth: 640 }}>
          <thead>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'right', width: 64 }}>Points</th>
              <th className="tbl-header" style={{ textAlign: 'left', width: s.levels.length > 1 ? 180 : undefined }}>Activated Skill</th>
              {s.levels.length > 1 && <th className="tbl-header" style={{ textAlign: 'left' }}>Effect</th>}
            </tr>
          </thead>
          <tbody>
            {s.levels.map((lv, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell" style={{
                  textAlign: 'right', color: signColor(lv.points), fontWeight: 600,
                }}>
                  {signStr(lv.points)}
                </td>
                <td className="tbl-cell">{lv.name}</td>
                {s.levels.length > 1 && (
                  <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 12 * scale }}>
                    {lv.description}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Armor pieces */}
      {pieces.length > 0 && (
        <Section title="Armor Pieces">
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ width: 28 }} />
                <th className="tbl-header" style={{ textAlign: 'left' }}>Piece</th>
                <th className="tbl-header" style={{ textAlign: 'right', width: 60 }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell" style={{ padding: '2px 4px' }}>
                    <img src={slotIcon(p.slot, p.rarity)} alt={p.slot}
                         width={20 * scale} height={20 * scale} style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }} />
                  </td>
                  <td className="tbl-cell">{p.pieceName}</td>
                  <td className="tbl-cell" style={{
                    textAlign: 'right', color: signColor(p.points), fontWeight: 600,
                  }}>
                    {signStr(p.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
