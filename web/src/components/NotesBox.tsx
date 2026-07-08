import { useEffect, useState } from 'react'
import { useNotes, type NoteTarget } from '../hooks/useNotes'
import { useTextScale } from '../theme/textScale'

/**
 * The per-entity "Notes" editor shown on a detail page (monster/weapon/armor
 * set/quest). Loads the saved note, saves on blur; a blank note clears it.
 * Wrap it in the page's own <Section title="Notes"> for a matching heading.
 */
export default function NotesBox({ target }: { target: NoteTarget }) {
  const scale = useTextScale()
  const { getNote, setNote } = useNotes()
  const [text, setText] = useState(() => getNote(target.type, target.id))

  // Reload when the page switches to a different entity.
  useEffect(() => {
    setText(getNote(target.type, target.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.type, target.id])

  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => setNote(target, text)}
      placeholder="Add your own notes…"
      style={{
        width: '100%', minHeight: 80, maxHeight: 240, resize: 'vertical',
        boxSizing: 'border-box', fontFamily: 'inherit',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
        color: 'var(--text)', padding: '8px 10px', fontSize: 13 * scale, lineHeight: 1.6,
        outline: 'none',
      }}
    />
  )
}
