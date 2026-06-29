import { useNavigate } from 'react-router-dom'
import { useBookmarks } from '../hooks/useBookmarks'

const TYPE_LABELS: Record<string, string> = {
  monster: 'Monster', weapon: 'Weapon', item: 'Item',
  armorset: 'Armor Set', skill: 'Armor Skill', decoration: 'Decoration',
}

export default function BookmarksPage() {
  const { bookmarks, remove } = useBookmarks()
  const navigate = useNavigate()

  if (bookmarks.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
        <p style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>
          No bookmarks yet
        </p>
        <p style={{ margin: 0 }}>
          Tap the <span style={{ color: 'var(--accent)' }}>☆</span> star icon on any monster,
          weapon, item, or armor detail page to save it here for quick access.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{bookmarks.length} saved</span>
        <button
          onClick={() => { if (confirm('Clear all bookmarks?')) bookmarks.forEach(b => remove(b.path)) }}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 3, padding: '2px 10px', fontSize: 11,
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {bookmarks.map(bm => (
          <div key={bm.path} style={{
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--border)',
          }}>
            <button
              onClick={() => navigate(bm.path)}
              style={{
                flex: 1, padding: '10px 16px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.04em', color: 'var(--accent)', opacity: 0.7,
                minWidth: 76, flexShrink: 0,
              }}>
                {TYPE_LABELS[bm.type] ?? bm.type}
              </span>
              <span style={{ color: 'var(--text)', fontSize: 14 }}>{bm.name}</span>
            </button>
            <button
              onClick={() => remove(bm.path)}
              title="Remove bookmark"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 16, padding: '10px 14px',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
