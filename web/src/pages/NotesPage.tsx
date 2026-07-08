import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, type NoteRecord } from '../hooks/useNotes'
import { useNoteOrderIndex, useNoteEntity, useNoteImportLookup } from '../utils/noteOrder'
import { formatEntityBlock, parseImportedNotes, EXPORT_SIGNATURE, type ExportLevel } from '../utils/noteExport'
import { loadWeapons } from '../data/loaders'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'

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

const LEVEL_LABELS: [ExportLevel, string][] = [
  ['detailed', 'Detailed'],
  ['simple', 'Simple'],
  ['notes', 'Just the Notes'],
]

async function exportNotes(
  groups: Group[],
  level: ExportLevel,
  getEntity: ReturnType<typeof useNoteEntity>,
) {
  const allWeapons = level === 'detailed' ? await loadWeapons() : []
  const lines = [EXPORT_BANNER, EXPORT_SIGNATURE, '', `My Notes  —  exported ${new Date().toLocaleString()}`]
  for (const g of groups) {
    lines.push('', `## ${g.header}`)
    for (const n of g.entries) {
      lines.push('', `### ${n.name} (${n.category})`)
      if (level !== 'notes') {
        const block = formatEntityBlock(n, getEntity(n), level, allWeapons)
        if (block.length) lines.push(...block, '')
      }
      lines.push(`Notes: ${n.note}`)
    }
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
  const { notes, setNote, remove, importNotes } = useNotes()
  const navigate = useNavigate()
  const scale = useTextScale()
  const orderIndex = useNoteOrderIndex()
  const getEntity = useNoteEntity()
  const importLookup = useNoteImportLookup()
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groups: Group[] = SECTIONS
    .map(s => ({ ...s, entries: notes.filter(n => n.type === s.type) }))
    .filter(g => g.entries.length > 0)
    .map(g => ({
      ...g,
      entries: [...g.entries].sort((a, b) => {
        const diff = orderIndex(a) - orderIndex(b)
        return Number.isFinite(diff) ? diff : 0
      }),
    }))

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseImportedNotes(text, importLookup)
    if (!parsed) {
      setMessage('That file doesn\'t look like an MHFU Notes export — nothing was imported.')
      return
    }
    if (parsed.notes.length === 0) {
      setMessage(parsed.unresolved > 0
        ? `Couldn't match any notes to a current entity (${parsed.unresolved} skipped).`
        : 'No notes found in that file.')
      return
    }
    const count = importNotes(parsed.notes)
    const skipped = parsed.unresolved > 0 ? `, ${parsed.unresolved} skipped (entity not found)` : ''
    setMessage(`Imported ${count} note${count === 1 ? '' : 's'}${skipped}.`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'transparent' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700, color: 'var(--text)' }}>Notes</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13 * scale, color: 'var(--muted)', maxWidth: 640 }}>
            Every note you've added to a monster, weapon or armor set. Edit it here,
            click the name to open its page, or remove it with ✕.
          </p>
          {message && (
            <p style={{ margin: '4px 0 0', fontSize: 12 * scale, color: 'var(--accent)' }}>{message}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '5px 12px', fontSize: 12 * scale, cursor: 'pointer',
            }}
          >
            Import Notes…
          </button>
          {groups.length > 0 && <ExportMenu groups={groups} getEntity={getEntity} />}
        </div>
      </div>

      {groups.length === 0 ? (
        <p style={{ padding: '4px 16px', margin: 0, color: 'var(--muted)', fontSize: 13 * scale, maxWidth: 640 }}>
          {EMPTY_TEXT}
        </p>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 * scale, margin: '12px 0 4px' }}>
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

function ExportMenu({ groups, getEntity }: { groups: Group[]; getEntity: ReturnType<typeof useNoteEntity> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const scale = useTextScale()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const choose = (level: ExportLevel) => {
    setOpen(false)
    void exportNotes(groups, level, getEntity)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text)', padding: '5px 12px', fontSize: 12 * scale, cursor: 'pointer',
        }}
      >
        Export Notes…
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 2, zIndex: 30,
          minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {LEVEL_LABELS.map(([level, label]) => (
            <div
              key={level}
              onClick={() => choose(level)}
              className="menu-row"
              style={{ padding: '7px 12px', fontSize: 13 * scale, cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' }}
            >
              {label}
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
  const scale = useTextScale()
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
          <img src={src} alt="" width={28 * scale} height={28 * scale} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <span>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)', fontSize: 13 * scale }}>{note.name}</span>
            <span style={{ display: 'block', fontSize: 11 * scale, color: 'var(--muted)' }}>{note.category}</span>
          </span>
        </button>
        <button
          onClick={onDelete}
          title="Delete note"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 14 * scale, padding: '2px 6px', alignSelf: 'flex-start',
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
          color: 'var(--text)', padding: '8px 10px', fontSize: 13 * scale, lineHeight: 1.6, outline: 'none',
        }}
      />
    </div>
  )
}
