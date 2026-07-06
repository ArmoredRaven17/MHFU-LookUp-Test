import { useBookmarks, type Bookmark } from '../hooks/useBookmarks'
import { BASE } from '../utils/assets'

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
        padding: '0 6px 2px', display: 'inline-flex', alignItems: 'center',
        alignSelf: 'center',
      }}
    >
      <img
        src={`${BASE}/assets/Misc/bookmark_${active ? 'on' : 'off'}.png`}
        alt={active ? 'Bookmarked' : 'Not bookmarked'}
        width={24}
        height={24}
        style={{ objectFit: 'contain' }}
      />
    </button>
  )
}
