import { useCallback, useEffect, useState } from 'react'

/** The entity a note is attached to (mirrors desktop's per-entity user_notes rows). */
export interface NoteTarget {
  type: string      // 'monster' | 'weapon' | 'armorset' | 'quest'
  id: string
  name: string
  category: string  // monster/weapon type, armor rank, quest kind — shown in the Notes tab
  path: string      // route to the entity, for the Notes tab's click-to-open
  icon?: string     // full asset url resolved at write time
}

export interface NoteRecord extends NoteTarget {
  note: string
}

const KEY = 'mhfu-notes'

function read(): NoteRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    // Tolerate legacy / foreign shapes: keep only well-formed per-entity notes.
    return Array.isArray(parsed)
      ? parsed.filter((n): n is NoteRecord => !!n && typeof n.note === 'string' && !!n.type && !!n.id)
      : []
  } catch { return [] }
}

function write(notes: NoteRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(notes))
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteRecord[]>(read)

  useEffect(() => {
    const handler = () => setNotes(read())
    window.addEventListener('mhfu-notes', handler)
    return () => window.removeEventListener('mhfu-notes', handler)
  }, [])

  const dispatch = useCallback((next: NoteRecord[]) => {
    write(next)
    setNotes(next)
    window.dispatchEvent(new Event('mhfu-notes'))
  }, [])

  /** Current note text for an entity (empty string when none). */
  const getNote = useCallback((type: string, id: string) => {
    return read().find(n => n.type === type && n.id === id)?.note ?? ''
  }, [])

  /** Save a note; a blank/whitespace note deletes it (matches desktop). */
  const setNote = useCallback((target: NoteTarget, note: string) => {
    const others = read().filter(n => !(n.type === target.type && n.id === target.id))
    dispatch(note.trim() ? [...others, { ...target, note }] : others)
  }, [dispatch])

  const remove = useCallback((type: string, id: string) => {
    dispatch(read().filter(n => !(n.type === type && n.id === id)))
  }, [dispatch])

  return { notes, getNote, setNote, remove }
}
