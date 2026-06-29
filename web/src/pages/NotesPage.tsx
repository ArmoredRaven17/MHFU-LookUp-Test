import { useCallback, useEffect, useRef, useState } from 'react'

interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

const KEY = 'mhfu-notes'

function readNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function writeNotes(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes))
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(readNotes)
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  const selected = notes.find(n => n.id === selectedId) ?? null

  // Load selected note into editor
  useEffect(() => {
    if (selected) {
      setTitle(selected.title)
      setBody(selected.body)
      dirty.current = false
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback((id: string, t: string, b: string) => {
    const next = readNotes().map(n =>
      n.id === id ? { ...n, title: t, body: b, updatedAt: Date.now() } : n
    )
    writeNotes(next)
    setNotes(next)
    dirty.current = false
  }, [])

  function scheduleSave(id: string, t: string, b: string) {
    dirty.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(id, t, b), 800)
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    if (selectedId) scheduleSave(selectedId, v, body)
  }

  function handleBodyChange(v: string) {
    setBody(v)
    if (selectedId) scheduleSave(selectedId, title, v)
  }

  function createNote() {
    if (selectedId && dirty.current) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      save(selectedId, title, body)
    }
    const note: Note = { id: newId(), title: 'New Note', body: '', updatedAt: Date.now() }
    const next = [note, ...readNotes()]
    writeNotes(next)
    setNotes(next)
    setSelectedId(note.id)
  }

  function selectNote(id: string) {
    if (selectedId && dirty.current) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      save(selectedId, title, body)
    }
    setSelectedId(id)
  }

  function deleteNote(id: string) {
    const next = readNotes().filter(n => n.id !== id)
    writeNotes(next)
    setNotes(next)
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 220, minWidth: 220,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={createNote}
            style={{
              width: '100%', padding: '5px 0', fontSize: 12, fontWeight: 600,
              background: 'var(--accent)', border: 'none', borderRadius: 3,
              color: '#111', cursor: 'pointer',
            }}
          >
            + New Note
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notes.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: '12px 10px', fontSize: 12 }}>
              No notes yet.
            </p>
          )}
          {notes.map(n => {
            const active = n.id === selectedId
            return (
              <div key={n.id} style={{ position: 'relative' }}>
                <button
                  onClick={() => selectNote(n.id)}
                  style={{
                    display: 'block', width: '100%', padding: '7px 10px 7px 12px',
                    background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                    border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: active ? 'var(--accent)' : 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    paddingRight: 20,
                  }}>
                    {n.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {formatDate(n.updatedAt)}
                  </div>
                </button>
                <button
                  onClick={() => deleteNote(n.id)}
                  title="Delete note"
                  style={{
                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 13, padding: 4, lineHeight: 1,
                    opacity: active ? 0.6 : 0,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Editor panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {!selected ? (
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>
            Create a note to get started.
          </div>
        ) : (
          <>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Note title"
                style={{
                  width: '100%', background: 'none', border: 'none', outline: 'none',
                  color: 'var(--accent)', fontSize: 16, fontWeight: 600,
                }}
              />
            </div>
            <textarea
              value={body}
              onChange={e => handleBodyChange(e.target.value)}
              placeholder="Write your notes here…"
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'var(--bg)', color: 'var(--text)',
                padding: '12px 16px', fontSize: 13, lineHeight: 1.7,
                fontFamily: 'inherit',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
