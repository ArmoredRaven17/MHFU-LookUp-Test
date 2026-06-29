import { useBookmarks, type Bookmark } from '../hooks/useBookmarks'

interface Props {
  bookmark: Bookmark
}

export default function BookmarkButton({ bookmark }: Props) {
  const { isBookmarked, add, remove } = useBookmarks()
  const active = isBookmarked(bookmark.path)

  function toggle() {
    if (active) remove(bookmark.path)
    else add(bookmark)
  }

  return (
    <button
      onClick={toggle}
      title={active ? 'Remove bookmark' : 'Add bookmark'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 18, lineHeight: 1,
        color: active ? 'var(--accent)' : 'var(--muted)',
        padding: '2px 4px',
        transition: 'color 0.15s',
      }}
    >
      {active ? '★' : '☆'}
    </button>
  )
}
