import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, type NoteRecord } from '../hooks/useNotes'
import { BASE } from '../utils/assets'

// Group order, header, and fallback tab icon per type — mirrors desktop
// NotesViewModel.Sections (monster / weapon / armor set / quest).
const SECTIONS: { type: string; header: string; fallbackIcon: string }[] = [
  { type: 'monster',  header: 'Monsters',    fallbackIcon: 'tigrex' },
  { type: 'weapon',   header: 'Weapons',     fallbackIcon: 'rathalos' },
  { type: 'armorset', header: 'Armor Sets',  fallbackIcon: 'rathian' },
  { type: 'quest',    header: 'Quests',      fallbackIcon: 'yian_kut_ku' },
]

const EMPTY_TEXT =
  'No notes yet — open a monster or weapon and type in its Notes box to add one.'

// Plain block-lettering banner (no artwork) for the exported file — matches desktop.
const EXPORT_BANNER = `================================================================
     __  __  _   _  _____  _   _
    |  \\/  || | | ||  ___|| | | |      L  O  O  K  U  P
    | |\\/| || |_| || |_   | | | |
    | |  | ||  _  ||  _|  | |_| |      Offline Reference for
    |_|  |_||_| |_||_|     \\___/       Monster Hunter Freedom
                                       Unite  (MHP2G)
================================================================`

interface Group { type: string; header: string; fallbackIcon: string; entries: NoteRecord[] }

function exportNotes(groups: Group[]) {
  const lines = [EXPORT_BANNER, '', `My Notes  —  exported ${new Date().toLocaleString()}`]
  for (const g of groups) {
    lines.push('', `## ${g.header}`)
    for (const n of g.entries) lines.push('', `### ${n.name} (${n.category})`, n.note)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'MHFU Notes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export default function NotesPage() {
  const { notes, setNote, remove } = useNotes()
  const navigate = useNavigate()

  const groups: Group[] = SECTIONS
    .map(s => ({ ...s, entries: notes.filter(n => n.type === s.type) }))
    .filter(g => g.entries.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'transparent' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Notes</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)', maxWidth: 640 }}>
            Every note you've added to a monster, weapon or armor set. Edit it here,
            click the name to open its page, or remove it with ✕.
          </p>
        </div>
        {groups.length > 0 && (
          <button
            onClick={() => exportNotes(groups)}
            style={{
              flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '5px 12px', fontSize: 12, cursor: 'pointer',
            }}
          >
            Export Notes…
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p style={{ padding: '4px 16px', margin: 0, color: 'var(--muted)', fontSize: 13, maxWidth: 640 }}>
          {EMPTY_TEXT}
        </p>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13, margin: '12px 0 4px' }}>
                {g.header}
              </div>
              {g.entries.map(n => (
                <NoteCard
                  key={`${n.type}:${n.id}`}
                  note={n}
                  fallbackIcon={g.fallbackIcon}
                  onOpen={() => navigate(n.path)}
                  onSave={text => setNote(n, text)}
                  onDelete={() => remove(n.type, n.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note, fallbackIcon, onOpen, onSave, onDelete }: {
  note: NoteRecord
  fallbackIcon: string
  onOpen: () => void
  onSave: (text: string) => void
  onDelete: () => void
}) {
  const [text, setText] = useState(note.note)
  useEffect(() => { setText(note.note) }, [note.note])
  const src = note.icon ?? `${BASE}/assets/Monsters/${fallbackIcon}.png`

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <button
          onClick={onOpen}
          title="Open this page"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
          }}
        >
          <img src={src} alt="" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <span>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{note.name}</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{note.category}</span>
          </span>
        </button>
        <button
          onClick={onDelete}
          title="Delete note"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 14, padding: '2px 6px', alignSelf: 'flex-start',
          }}
        >
          ✕
        </button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onSave(text)}
        style={{
          width: '100%', minHeight: 56, maxHeight: 220, resize: 'vertical',
          boxSizing: 'border-box', fontFamily: 'inherit',
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
          color: 'var(--text)', padding: '8px 10px', fontSize: 13, lineHeight: 1.6, outline: 'none',
        }}
      />
    </div>
  )
}
