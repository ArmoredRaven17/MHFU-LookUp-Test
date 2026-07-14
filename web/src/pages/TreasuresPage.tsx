import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadTreasures, loadMonsters } from '../data/loaders'
import type { Treasure, Monster } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import { BASE } from '../utils/assets'
import { useItemSources, normName, type MonsterSource } from '../hooks/useItemSources'
import { locationColor } from '../utils/location'
import { useTextScale } from '../theme/textScale'
import CollapsiblePanel from '../components/CollapsiblePanel'

const AWARD_GOLD = '#E0B000'

// ── Treasure Hunt quests (ROM-sourced, f5342–f5353) ──────────────────────────
// Each maps to a treasures-table area; the objective/description are the shared
// ROM quest text. Stars + roaming monsters + their stats come from the monster data.
const TREASURE_QUEST_AREA: Record<string, string> = {
  'Treasure in the Mountains!': 'Snowy Mountains',
  'Treasure in the Jungle!': 'Jungle',
  'Treasure in the Desert!': 'Desert',
  'Treasure in the Swamp!': 'Swamp',
  'Treasure in the Hills!': 'Forest And Hills',
  'Treasure in the Lava!': 'Volcano',
  'Treasure in the Grt Forest!': 'Great Forest',
}
const TREASURE_OBJECTIVE = 'Gather 2,000 Pts before Time Over (or 2,000 Pts + a Ltd. Paw Pass Ticket)'
const TREASURE_DESC = 'Gather the treasure that lies sleeping in the field to earn points. I will calculate your ' +
  'total and reward you based on how much you can collect. Leave no treasure undiscovered!'
const starNum = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0

interface TreasureQuestMon { name: string; id: string; hp: number; atk: number; def: number; size: string; rage?: { atk: number; def: number } }
interface TreasureQuest { name: string; area: string; stars: string; monsters: TreasureQuestMon[] }

// Derive the treasure quests from the monster data (entries with rank "Treasure").
function buildTreasureQuests(monsters: Monster[]): TreasureQuest[] {
  const byName = new Map<string, TreasureQuest>()
  for (const m of monsters) {
    for (const e of m.quests?.entries ?? []) {
      if (e.rank !== 'Treasure') continue
      const area = TREASURE_QUEST_AREA[e.quest]
      if (!area) continue
      let q = byName.get(e.quest)
      if (!q) { q = { name: e.quest, area, stars: e.level, monsters: [] }; byName.set(e.quest, q) }
      q.monsters.push({
        name: m.name, id: m.id, hp: e.hp, atk: e.atk, def: e.def,
        size: e.size_min === e.size_max ? `${e.size_min}%` : `${e.size_min}–${e.size_max}%`,
        rage: m.quests?.rage,
      })
    }
  }
  return [...byName.values()].sort((a, b) => starNum(a.stars) - starNum(b.stars) || a.name.localeCompare(b.name))
}

export default function TreasuresPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scale = useTextScale()
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [search, setSearch] = useState('')
  const { monsterSrc } = useItemSources()

  useEffect(() => {
    loadTreasures().then(setTreasures)
    loadMonsters().then(setMonsters)
  }, [])

  const quests = useMemo(() => buildTreasureQuests(monsters), [monsters])

  // A quest is addressed as /treasures/q:<name>; a numeric id is an item. When nothing is
  // selected, the toggle's own state (`mode`) decides which list to show.
  const questId = id && id.startsWith('q:') ? id.slice(2) : null
  const [mode, setMode] = useState<'items' | 'quests'>(questId ? 'quests' : 'items')
  const effectiveMode: 'items' | 'quests' = id ? (id.startsWith('q:') ? 'quests' : 'items') : mode

  const selectedItem = useMemo(() => treasures.find(t => String(t.id) === id) ?? null, [treasures, id])
  const selectedQuest = useMemo(() => quests.find(q => q.name === questId) ?? null, [quests, questId])

  // Item groups by area (existing behaviour).
  const itemGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (t: Treasure) => !q || t.name.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q) || t.where_to_find.toLowerCase().includes(q)
    const order: string[] = []
    const byArea = new Map<string, Treasure[]>()
    for (const t of treasures) {
      if (!match(t)) continue
      if (!byArea.has(t.area)) { byArea.set(t.area, []); order.push(t.area) }
      byArea.get(t.area)!.push(t)
    }
    return order.map(a => ({ area: a, items: byArea.get(a)! }))
  }, [treasures, search])

  const questList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quests.filter(x => !q || x.name.toLowerCase().includes(q)
      || x.area.toLowerCase().includes(q) || x.monsters.some(m => m.name.toLowerCase().includes(q)))
  }, [quests, search])

  const tabBtn = (m: 'items' | 'quests', label: string) => (
    <button onClick={() => { setMode(m); navigate('/treasures') }} style={{
      flex: 1, padding: '5px 0', fontSize: 12 * scale, fontWeight: 600, cursor: 'pointer',
      background: effectiveMode ===m ? 'var(--header-bg)' : 'transparent',
      color: effectiveMode ===m ? 'var(--accent)' : 'var(--muted)',
      border: 'none', borderBottom: effectiveMode ===m ? '2px solid var(--accent)' : '2px solid transparent',
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <CollapsiblePanel width={260} style={{
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabBtn('items', 'Items')}
          {tabBtn('quests', 'Quests')}
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder={effectiveMode ==='items' ? 'Search treasures…' : 'Search quests…'} />
        {effectiveMode ==='items' && (
          <p style={{ margin: 0, padding: '0 10px 6px', fontSize: 11 * scale, fontStyle: 'italic', color: 'var(--muted)' }}>
            <span style={{ color: AWARD_GOLD }}>★</span> = Guild Card award (collect for a card award).
          </p>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {effectiveMode ==='items' ? (
            <>
              {itemGroups.map(g => (
                <div key={g.area}>
                  <div style={{ fontWeight: 700, color: locationColor(g.area), fontSize: 12 * scale, padding: '6px 10px 2px' }}>{g.area}</div>
                  {g.items.map(t => {
                    const active = selectedItem?.id === t.id
                    return (
                      <button key={t.id} onClick={() => navigate(`/treasures/${t.id}`)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '3px 10px',
                        background: active ? 'var(--header-bg)' : 'transparent',
                        border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                        color: active ? 'var(--accent)' : 'var(--text)',
                        cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
                      }}>
                        <img src={`${BASE}/assets/Items/${t.icon}.png`} alt="" width={24 * scale} height={24 * scale}
                             style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                        {t.is_award ? <span style={{ color: AWARD_GOLD, fontSize: 13 * scale, flexShrink: 0 }} title="Guild Card award">★</span> : null}
                        <span style={{ flex: 1 }}>{t.name}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
              {itemGroups.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No treasures found.</p>}
            </>
          ) : (
            <>
              {questList.map(q => {
                const active = selectedQuest?.name === q.name
                return (
                  <button key={q.name} onClick={() => navigate(`/treasures/${encodeURIComponent(`q:${q.name}`)}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 10px',
                    background: active ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
                  }}>
                    <span style={{ flex: 1 }}>{q.name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 * scale, flexShrink: 0 }}>{q.stars}</span>
                  </button>
                )
              })}
              {questList.length === 0 && <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No quests found.</p>}
            </>
          )}
        </div>
      </CollapsiblePanel>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {effectiveMode ==='quests'
          ? (selectedQuest
              ? <TreasureQuestDetail quest={selectedQuest} treasures={treasures} />
              : <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 * scale }}>Select a Treasure Hunt quest.</p>)
          : (selectedItem
              ? <TreasureDetail treasure={selectedItem} monsters={monsterSrc.get(normName(selectedItem.name)) ?? []} />
              : <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 * scale }}>Select a treasure from the list.</p>)
        }
      </div>
    </div>
  )
}

// ── Treasure Hunt quest detail ───────────────────────────────────────────────

function TreasureQuestDetail({ quest: q, treasures }: { quest: TreasureQuest; treasures: Treasure[] }) {
  const navigate = useNavigate()
  const scale = useTextScale()
  // Treasures obtainable on this quest: this area's + the All-Areas set.
  const areaItems = treasures.filter(t => t.area === q.area)
  const allItems = treasures.filter(t => t.area === 'All Areas')

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{q.name}</h2>
        <span style={{ color: 'var(--muted)', fontSize: 13 * scale }}>{q.stars}</span>
        <BookmarkButton bookmark={{ type: 'treasure', id: `q:${q.name}`, name: q.name, path: `/treasures/${encodeURIComponent(`q:${q.name}`)}` }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `${100 * scale}px 1fr`, rowGap: 4 * scale, columnGap: 10 * scale, fontSize: 13 * scale, marginBottom: 14 }}>
        <Field label="Objective">{TREASURE_OBJECTIVE}</Field>
        <Field label="Location"><span style={{ color: locationColor(q.area), fontWeight: 600 }}>{q.area}</span></Field>
        <Field label="Time Limit">50min</Field>
        <Field label="Reward"><span style={{ color: 'var(--positive)', fontWeight: 600 }}>Treasure points (exchanged for Pokke Points)</span></Field>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13 * scale, color: 'var(--muted)', lineHeight: 1.6 }}>{TREASURE_DESC}</p>

      {q.monsters.length > 0 && (
        <Section title="Monsters">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {q.monsters.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 * scale }}>
                <img src={`${BASE}/assets/Monsters/${m.id}.png`} alt="" width={22 * scale} height={22 * scale}
                     style={{ objectFit: 'contain', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <button onClick={() => navigate(`/monsters/${m.id}`)} style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600, fontSize: 13 * scale,
                }}>{m.name}</button>
                <span style={{ color: 'var(--muted)' }}>
                  <b style={{ color: 'var(--text)' }}>HP</b> {m.hp}{'  ·  '}<b style={{ color: 'var(--text)' }}>Atk</b> {m.atk}
                  {'  ·  '}<b style={{ color: 'var(--text)' }}>Def</b> {m.def}{'  ·  '}<b style={{ color: 'var(--text)' }}>Size</b> {m.size}
                  {m.rage && <>{'  ·  '}<span style={{ color: 'var(--text)' }}>Enraged</span> ×{m.rage.atk} atk / ×{m.rage.def} def</>}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <TreasureChips title={`Treasures — ${q.area}`} items={areaItems} navigate={navigate} scale={scale} />
      <TreasureChips title="Treasures — All Areas" items={allItems} navigate={navigate} scale={scale} />
    </div>
  )
}

function TreasureChips({ title, items, navigate, scale }: {
  title: string; items: Treasure[]; navigate: ReturnType<typeof useNavigate>; scale: number
}) {
  if (items.length === 0) return null
  return (
    <Section title={title}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(t => (
          <button key={t.id} onClick={() => navigate(`/treasures/${t.id}`)} title={`${t.points} pts`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 4px',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            cursor: 'pointer', color: 'var(--text)', fontSize: 12 * scale,
          }}>
            <img src={`${BASE}/assets/Items/${t.icon}.png`} alt="" width={18 * scale} height={18 * scale}
                 style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                 onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
            {t.is_award ? <span style={{ color: AWARD_GOLD, flexShrink: 0 }}>★</span> : null}
            {t.name}
          </button>
        ))}
      </div>
    </Section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <>
      <span style={{ color: 'var(--muted)', fontSize: 11 * scale, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 1 }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{children}</span>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function TreasureDetail({ treasure: t, monsters }: { treasure: Treasure; monsters: MonsterSource[] }) {
  const navigate = useNavigate()
  const scale = useTextScale()
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img src={`${BASE}/assets/Items/${t.icon}.png`} alt={t.name} width={48 * scale} height={48 * scale}
             style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{t.name}</h2>
            {t.is_award ? (
              <span style={{ background: AWARD_GOLD, color: '#1E1E1E', borderRadius: 3, padding: '2px 6px', fontSize: 10 * scale, fontWeight: 700 }}>★ AWARD</span>
            ) : null}
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 * scale }}>{t.area}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'treasure', id: String(t.id), name: t.name, path: `/treasures/${t.id}`, icon: t.icon ? `${BASE}/assets/Items/${t.icon}.png` : undefined }} />
      </div>

      {t.description && (
        <p style={{ margin: '0 0 14px', fontSize: 13 * scale, color: 'var(--text)' }}>{t.description}</p>
      )}

      <table style={{ borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          {[
            ['Where to Find', t.where_to_find || '—'],
            ['Points', t.points || '—'],
            ['Rarity', t.rarity || '—'],
          ].map(([label, value]) => (
            <tr key={label} className="tbl-row">
              <td className="tbl-cell" style={{ color: 'var(--muted)', width: 110, verticalAlign: 'top' }}>{label}</td>
              <td className="tbl-cell">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {monsters.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Obtained From Monsters</h3>
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
        </div>
      )}
    </div>
  )
}
