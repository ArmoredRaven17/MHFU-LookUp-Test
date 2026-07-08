import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadQuests, loadMonsters, loadItems } from '../data/loaders'
import type { Quest, QuestCategory, Monster, Item, QuestLoadout } from '../types'
import { BASE } from '../utils/assets'
import { locationIconUrl, locationColor } from '../utils/location'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import MaterialList from '../components/MaterialList'
import { useTextScale } from '../theme/textScale'

const cleanMonster = (n: string) => n.replace(/[?!*]+\s*$/, '').trim()

// "Great Forest (Day)" → { location, timeOfDay }.
function splitArea(area: string) {
  const m = area.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  return m ? { location: m[1].trim(), timeOfDay: m[2].trim() } : { location: area.trim(), timeOfDay: '' }
}

const questId = (slug: string, name: string) => `${slug}::${name}`

function wordMatch(objLower: string, nameLower: string) {
  const re = new RegExp('\\b' + nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es)?\\b')
  return re.test(objLower)
}

export default function QuestBrowser({ routeBase, categoryOrder, training }: {
  routeBase: string                    // '/quests' or '/training'
  categoryOrder: [string, string][]    // [slug, label] in display order
  training: boolean                    // adds Danger / Weapon Selection / author notes
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const scale = useTextScale()
  const [categories, setCategories] = useState<QuestCategory[]>([])
  const [monsterId, setMonsterId] = useState<Map<string, string>>(new Map())
  const [itemsByLen, setItemsByLen] = useState<{ name: string; icon: string }[]>([])

  const slugs = useMemo(() => categoryOrder.map(c => c[0]), [categoryOrder])
  const defaultSlug = slugs[0]
  const questPath = (slug: string, name: string) => `${routeBase}/${encodeURIComponent(questId(slug, name))}`

  useEffect(() => {
    loadQuests().then(all => {
      const mine = all.filter(c => slugs.includes(c.slug)).sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug))
      setCategories(mine)
    })
    loadMonsters().then((ms: Monster[]) => setMonsterId(new Map(ms.map(m => [m.name.toLowerCase(), m.id]))))
    loadItems().then((items: Item[]) => setItemsByLen(
      items.filter(i => i.icon).map(i => ({ name: i.name, icon: i.icon })).sort((a, b) => b.name.length - a.name.length)
    ))
  }, [slugs]) // eslint-disable-line react-hooks/exhaustive-deps

  const monIcon = (name: string) => {
    const mid = monsterId.get(cleanMonster(name).toLowerCase())
    return mid ? `${BASE}/assets/Monsters/${mid}.png` : null
  }

  const targetIcons = useMemo(() => {
    const monsterNames = [...monsterId.keys()]
    const deliveryIcon = (objLower: string) => {
      for (const it of itemsByLen)
        if (it.name.length >= 4 && objLower.includes(it.name.toLowerCase())) return `${BASE}/assets/Items/${it.icon}.png`
      return null
    }
    return (q: Quest): string[] => {
      const objLower = q.objective.toLowerCase()
      if (/\bdeliver/.test(objLower)) {
        const item = deliveryIcon(objLower)
        if (item) return [item]
      }
      let matched = q.monsters.map(cleanMonster).filter(n => n.length >= 3 && wordMatch(objLower, n.toLowerCase()))
      if (matched.length === 0 && !/\bdeliver/.test(objLower))
        matched = monsterNames.filter(n => wordMatch(objLower, n))
      matched = matched.filter(n => !matched.some(o => o !== n && o.length > n.length && o.toLowerCase().includes(n.toLowerCase())))
      const icons = matched.map(monIcon).filter((s): s is string => !!s)
      if (icons.length) return icons
      return q.monsters.map(monIcon).filter((s): s is string => !!s)
    }
  }, [monsterId, itemsByLen]) // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => {
    if (!id) return null
    const i = id.indexOf('::')
    return i < 0 ? null : { slug: id.slice(0, i), name: id.slice(i + 2) }
  }, [id])

  const [catSlug, setCatSlug] = useState(parsed?.slug && slugs.includes(parsed.slug) ? parsed.slug : defaultSlug)
  useEffect(() => {
    if (parsed?.slug && slugs.includes(parsed.slug) && parsed.slug !== catSlug) setCatSlug(parsed.slug)
  }, [parsed?.slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const cat = useMemo(() => categories.find(c => c.slug === catSlug), [categories, catSlug])
  const selected = useMemo(() => {
    if (!parsed || !cat) return null
    for (const r of cat.ranks) { const q = r.quests.find(x => x.name === parsed.name); if (q) return q }
    return null
  }, [parsed, cat])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 280, minWidth: 280,
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <select value={catSlug} onChange={e => { setCatSlug(e.target.value); navigate(routeBase) }} style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text)', padding: '4px 6px', fontSize: 12 * scale,
          }}>
            {categoryOrder.filter(([s]) => categories.some(c => c.slug === s)).map(([slug, label]) => (
              <option key={slug} value={slug}>{label}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {cat?.ranks.map((rank, ri) => (
            <div key={ri}>
              {rank.label && (
                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 12 * scale, padding: '6px 10px 2px' }}>
                  {rank.label}
                </div>
              )}
              {rank.quests.map(q => {
                const active = selected === q
                return (
                  <button key={q.name} onClick={() => navigate(questPath(catSlug, q.name))} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '5px 10px',
                    background: active ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
                  }}>
                    <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {targetIcons(q).map((src, i) => (
                        <img key={i} src={src} alt="" width={20} height={20}
                          style={{ objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ))}
                    </span>
                    <span style={{ flex: 1, lineHeight: 1.3 }}>{q.name}</span>
                    {q.urgent
                      ? <QuestBadge label="URGENT" bg="var(--negative)" />
                      : q.key ? <QuestBadge label="KEY" bg="#B8860B" /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 * scale }}>Select a quest.</p>
          : <QuestDetail quest={selected} slug={catSlug} icons={targetIcons(selected)} training={training}
                         path={questPath(catSlug, selected.name)} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function QuestDetail({ quest: q, slug, icons, training, path }: {
  quest: Quest; slug: string; icons: string[]; training: boolean; path: string
}) {
  const scale = useTextScale()
  const { location, timeOfDay } = splitArea(q.area)
  const bmIcon = icons[0]
  const desc = q.description && q.description !== ':' ? q.description : null
  const id = questId(slug, q.name)

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ display: 'flex', gap: 4 }}>
          {icons.map((src, i) => (
            <img key={i} src={src} alt="" width={34} height={34}
              style={{ objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ))}
        </span>
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{q.name}</h2>
        <BookmarkButton bookmark={{ type: 'quest', id, name: q.name, path, icon: bmIcon }} />
        {q.urgent
          ? <QuestBadge label="URGENT" bg="var(--negative)" big />
          : q.key ? <QuestBadge label="KEY" bg="#B8860B" big /> : null}
      </div>

      {/* Field grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 4, columnGap: 10, fontSize: 13 * scale, marginBottom: 14 }}>
        <Field label="Objective">{q.objective}</Field>
        {training && q.danger && <Field label="Danger"><span style={{ color: 'var(--text)', fontWeight: 600 }}>{q.danger}</span></Field>}
        {q.environment && (
          <Field label="Environment">
            <span style={{
              background: q.environment.toLowerCase() === 'stable' ? 'var(--positive)' : 'var(--negative)',
              color: '#fff', fontSize: 11 * scale, fontWeight: 700, padding: '1px 7px', borderRadius: 3,
            }}>{q.environment}</span>
          </Field>
        )}
        <Field label="Location">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <img src={locationIconUrl(location)} alt="" width={20} height={20} style={{ objectFit: 'contain' }}
                 onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span style={{ color: locationColor(location), fontWeight: 600 }}>{location}</span>
          </span>
        </Field>
        {timeOfDay && <Field label="Time">{timeOfDay}</Field>}
        <Field label="Time Limit">{q.time}</Field>
        <Field label="Contract Fee">{q.fee}</Field>
        <Field label="Reward"><span style={{ color: 'var(--positive)', fontWeight: 600 }}>{q.reward}</span></Field>
      </div>

      {q.monsters.length > 0 && (
        <Section title="Monsters">
          <p style={{ margin: 0, fontSize: 13 * scale, color: 'var(--text)' }}>{q.monsters.join(', ')}</p>
        </Section>
      )}

      {desc && (
        <Section title="Description">
          <p style={{ margin: 0, fontSize: 13 * scale, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
        </Section>
      )}

      {/* Weapon Selection (Training School) */}
      {training && q.loadouts && q.loadouts.length > 0 && (
        <Section title="Weapon Selection">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {q.loadouts.map((lo, i) => <LoadoutCard key={i} loadout={lo} />)}
          </div>
        </Section>
      )}

      {q.rewards.length > 0 && (
        <Section title="Rewards">
          <MaterialList csv={q.rewards.join(', ')} vertical />
        </Section>
      )}

      {/* Quest-author notes (read-only) */}
      {q.notes && (
        <Section title="Notes">
          <p style={{ margin: 0, fontSize: 13 * scale, color: 'var(--muted)', lineHeight: 1.6 }}>{q.notes}</p>
        </Section>
      )}

      {q.unlock && (
        <p style={{ margin: '0 0 14px', fontSize: 12 * scale, color: 'var(--muted)', fontStyle: 'italic' }}>{q.unlock}</p>
      )}

      <Section title="My Notes">
        <NotesBox target={{ type: 'quest', id, name: q.name, category: training ? 'Training School' : 'Quest', path, icon: bmIcon }} />
      </Section>
    </div>
  )
}

function LoadoutCard({ loadout: lo }: { loadout: QuestLoadout }) {
  const scale = useTextScale()
  const setText = lo.armor
    .filter(a => a.name && a.name.toLowerCase() !== 'nothing')
    .map(a => a.name).join(', ')
  const skills = lo.active_skills.map(s => typeof s === 'string' ? { name: s, negative: false } : { name: s.name, negative: !!s.negative })

  return (
    <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 13 * scale }}>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{lo.weapon_type}</span>
        {lo.weapon && <span style={{ color: 'var(--text)' }}> — {lo.weapon}</span>}
      </summary>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lo.description && (
          <p style={{ margin: 0, fontSize: 12 * scale, color: 'var(--muted)', lineHeight: 1.6 }}>{lo.description}</p>
        )}
        {setText && (
          <div style={{ fontSize: 12 * scale }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>Set: </span>
            <span style={{ color: 'var(--text)' }}>{setText}</span>
          </div>
        )}
        {skills.length > 0 && (
          <div style={{ fontSize: 12 * scale }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>Active Skills: </span>
            {skills.map((s, i) => (
              <span key={i} style={{ color: s.negative ? 'var(--negative)' : 'var(--positive)', fontWeight: 600 }}>
                {i > 0 && <span style={{ color: 'var(--muted)' }}>, </span>}{s.name}
              </span>
            ))}
          </div>
        )}
        {lo.items.length > 0 && (
          <div style={{ fontSize: 12 * scale }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Items</span>
            <MaterialList csv={lo.items.join(', ')} vertical />
          </div>
        )}
      </div>
    </details>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function QuestBadge({ label, bg, big }: { label: string; bg: string; big?: boolean }) {
  const scale = useTextScale()
  return (
    <span style={{
      background: bg, color: '#fff', fontWeight: 700, borderRadius: 3, letterSpacing: '0.04em',
      fontSize: (big ? 10 : 9) * scale, padding: big ? '2px 6px' : '1px 5px', flexShrink: 0,
    }}>{label}</span>
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
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
