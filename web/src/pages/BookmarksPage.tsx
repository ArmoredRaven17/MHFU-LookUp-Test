import { useNavigate } from 'react-router-dom'
import { useBookmarks, type Bookmark } from '../hooks/useBookmarks'
import { BASE } from '../utils/assets'

// Display order, header, and fallback tab icon per entity type — mirrors
// desktop BookmarksViewModel.Sections (and the Layout nav icons).
const SECTIONS: { type: string; header: string; fallbackIcon: string }[] = [
  { type: 'monster',    header: 'Monsters',     fallbackIcon: 'tigrex' },
  { type: 'weapon',     header: 'Weapons',      fallbackIcon: 'rathalos' },
  { type: 'item',       header: 'Items',        fallbackIcon: 'melynx' },
  { type: 'armorset',   header: 'Armor Sets',   fallbackIcon: 'rathian' },
  { type: 'decoration', header: 'Decorations',  fallbackIcon: 'great_thunderbug' },
  { type: 'quest',      header: 'Quests',       fallbackIcon: 'yian_kut_ku' },
  { type: 'treasure',   header: 'Treasures',    fallbackIcon: 'bulldrome' },
  { type: 'armorskill', header: 'Armor Skills', fallbackIcon: 'daimyo_hermitaur' },
  { type: 'gathering',  header: 'Gathering',    fallbackIcon: 'kelbi' },
  { type: 'trenya',     header: 'Trenya',       fallbackIcon: 'plesioth' },
]

const EMPTY_TEXT =
  'No bookmarks yet — tap the bookmark icon on any monster, weapon, item, armor set, ' +
  'armor skill, decoration, quest, treasure, gathering area or Trenya destination to add one.'

export default function BookmarksPage() {
  const { bookmarks, remove } = useBookmarks()
  const navigate = useNavigate()

  const groups = SECTIONS
    .map(s => ({ ...s, entries: bookmarks.filter(b => b.type === s.type) }))
    .filter(g => g.entries.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'transparent' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Bookmarks</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Star a monster, weapon, item, armor set, decoration, quest or treasure on its page,
          then click it here to jump straight back to it.
        </p>
      </div>

      {groups.length === 0 ? (
        <p style={{ padding: '4px 16px', margin: 0, color: 'var(--muted)', fontSize: 13, maxWidth: 640 }}>
          {EMPTY_TEXT}
        </p>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{
                fontWeight: 700, color: 'var(--text)', fontSize: 13,
                margin: '12px 0 2px',
              }}>
                {g.header}
              </div>
              {g.entries.map(bm => (
                <BookmarkRow
                  key={bm.path}
                  bm={bm}
                  fallbackIcon={g.fallbackIcon}
                  onOpen={() => navigate(bm.path)}
                  onRemove={() => remove(bm.path)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BookmarkRow({ bm, fallbackIcon, onOpen, onRemove }: {
  bm: Bookmark
  fallbackIcon: string
  onOpen: () => void
  onRemove: () => void
}) {
  const src = bm.icon ?? `${BASE}/assets/Monsters/${fallbackIcon}.png`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <button
        onClick={onOpen}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: '2px 0',
        }}
      >
        <img src={src} alt="" width={32} height={32} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ color: 'var(--text)', fontSize: 14 }}>{bm.name}</span>
      </button>
      <button
        onClick={onRemove}
        title="Remove bookmark"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 14, padding: '4px 8px', flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
